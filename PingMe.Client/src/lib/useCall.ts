import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatHub } from "./hub";
import { api } from "./api";

// ── Types ────────────────────────────────────────────────────────────────────

export type CallType = "audio" | "video";
export type CallStatus = "idle" | "ringing" | "calling" | "in-call";

export interface CallParticipant {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export interface IncomingCallInfo {
  callerId: string;
  callerUsername: string;
  callerAvatarUrl?: string;
  chatId: string;
  callType: CallType;
  sdpOffer: string;
}

export interface CallState {
  status: CallStatus;
  callType: CallType | null;
  chatId: string | null;
  remote: CallParticipant | null;
  incomingCall: IncomingCallInfo | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
}

export interface CallEndRecord {
  chatId: string;
  callType: CallType;
  status: "completed" | "missed" | "declined" | "busy";
  duration: number;
  isCaller: boolean;
}

// ── STUN fallback (used when TURN credentials cannot be fetched) ──────────────
const STUN_ONLY_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Fetch TURN credentials from backend (which proxies metered.ca API)
async function fetchRtcConfig(token: string): Promise<RTCConfiguration> {
  try {
    const iceServers = await api.getTurnCredentials(token);
    console.log("[WebRTC] Fetched ICE servers:", iceServers.length, "entries", iceServers.map(s => typeof s.urls === 'string' ? s.urls : s.urls[0]));
    if (iceServers.length === 0) return STUN_ONLY_CONFIG;
    return { iceServers, iceTransportPolicy: "all" as RTCIceTransportPolicy };
  } catch (err) {
    console.warn("[WebRTC] Failed to fetch TURN credentials, using STUN-only fallback:", err);
    return STUN_ONLY_CONFIG;
  }
}

// ── Helper ───────────────────────────────────────────────────────────────────

function parsePayload<T>(raw: unknown): T {
  if (typeof raw === "string") return JSON.parse(raw) as T;
  return raw as T;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCall(
  hub: ChatHub | null,
  myUserId: string | null,
  getMember: (userId: string) => { username: string; avatarUrl?: string } | undefined,
  token: string | null = null,
  onCallEnded?: (record: CallEndRecord) => void,
) {
  const tokenRef = useRef<string | null>(token);
  tokenRef.current = token;
  const onCallEndedRef = useRef(onCallEnded);
  onCallEndedRef.current = onCallEnded;

  const [callState, setCallState] = useState<CallState>({
    status: "idle",
    callType: null,
    chatId: null,
    remote: null,
    incomingCall: null,
    isMicOn: true,
    isCameraOn: true,
    isScreenSharing: false,
  });

  // Expose streams as React state so CallView can attach them with useEffect
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const isCallerRef = useRef<boolean>(false);
  const callTypeRef = useRef<CallType>("audio");
  const callStartTimeRef = useRef<number | null>(null);
  const callEndedFiredRef = useRef<boolean>(false);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callStateRef = useRef(callState);
  callStateRef.current = callState;

  // Keep hub in a ref too so closures inside createPeerConnection always see current hub
  const hubRef = useRef<ChatHub | null>(null);
  hubRef.current = hub;

  const updateState = useCallback((patch: Partial<CallState>) => {
    setCallState(prev => ({ ...prev, ...patch }));
  }, []);

  const drainPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (!pc || !pc.remoteDescription) return;
    const candidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    if (candidates.length > 0) {
      console.log(`[WebRTC] Draining ${candidates.length} queued ICE candidate(s)`);
      for (const cand of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
          console.log("[WebRTC] Added queued ICE candidate successfully:", cand.candidate?.slice(0, 40));
        } catch (err) {
          console.warn("[WebRTC] Failed to add queued ICE candidate:", err);
        }
      }
    }
  }, []);

  const createPeerConnection = useCallback((rtcConfig: RTCConfiguration): RTCPeerConnection => {
    if (pcRef.current) pcRef.current.close();
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && hubRef.current && remoteUserIdRef.current && chatIdRef.current) {
        console.log("[WebRTC] Sending ICE candidate:", e.candidate.type, e.candidate.protocol, e.candidate.address);
        hubRef.current.invokeCall("SendIceCandidate", remoteUserIdRef.current, chatIdRef.current, JSON.stringify(e.candidate));
      } else if (!e.candidate) {
        console.log("[WebRTC] ICE gathering complete");
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
    };

    pc.ontrack = (e) => {
      console.log("[WebRTC] Remote track received:", e.track.kind, "readyState:", e.track.readyState);
      e.track.onunmute = () => {
        console.log("[WebRTC] Remote track unmuted (audio/video flowing!):", e.track.kind);
      };
      // Use the incoming stream (contains both audio + video tracks)
      if (e.streams && e.streams[0]) {
        console.log("[WebRTC] Using stream from event, tracks:", e.streams[0].getTracks().map(t => `${t.kind}:${t.readyState}`));
        setRemoteStream(e.streams[0]);
      } else {
        // Fallback: build stream from individual tracks
        setRemoteStream(prev => {
          const stream = prev ?? new MediaStream();
          stream.addTrack(e.track);
          return stream;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      // NOTE: "disconnected" is temporary and should not kill the call.
      // Only "failed" or "closed" is terminal.
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupCall(false);
      }
    };

    return pc;
  }, []); // no hub dep — uses hubRef.current at call time

  const getUserMedia = useCallback(async (type: CallType): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === "video" ? { width: 1280, height: 720 } : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const finalizeCall = useCallback((overrideStatus?: "declined" | "busy") => {
    if (callEndedFiredRef.current) return;
    const targetChatId = currentChatIdRef.current || chatIdRef.current;
    const wasCaller = isCallerRef.current;
    const currentStatus = callStateRef.current.status;
    const type = callTypeRef.current || callStateRef.current.callType || "audio";

    if (targetChatId && wasCaller) {
      callEndedFiredRef.current = true;
      let finalStatus: "completed" | "missed" | "declined" | "busy" = overrideStatus || "completed";
      let duration = 0;

      if (overrideStatus) {
        finalStatus = overrideStatus;
      } else if (currentStatus === "in-call" && callStartTimeRef.current) {
        finalStatus = "completed";
        duration = Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000));
      } else {
        finalStatus = "missed";
      }

      onCallEndedRef.current?.({
        chatId: targetChatId,
        callType: type,
        status: finalStatus,
        duration,
        isCaller: true,
      });
    }
  }, []);

  const cleanupCall = useCallback((notifyRemote: boolean = true) => {
    finalizeCall();
    if (notifyRemote && hubRef.current && remoteUserIdRef.current && chatIdRef.current) {
      hubRef.current.invokeCall("EndCall", remoteUserIdRef.current, chatIdRef.current);
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    remoteUserIdRef.current = null;
    chatIdRef.current = null;
    currentChatIdRef.current = null;
    callStartTimeRef.current = null;
    isCallerRef.current = false;
    callEndedFiredRef.current = false;
    setLocalStream(null);
    setRemoteStream(null);
    setCallState({
      status: "idle", callType: null, chatId: null, remote: null,
      incomingCall: null, isMicOn: true, isCameraOn: true, isScreenSharing: false,
    });
  }, [finalizeCall]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startCall = useCallback(async (calleeUserId: string, chatId: string, type: CallType) => {
    if (!hubRef.current || !myUserId || callStateRef.current.status !== "idle") return;
    pendingCandidatesRef.current = [];
    isCallerRef.current = true;
    callTypeRef.current = type;
    currentChatIdRef.current = chatId;
    callStartTimeRef.current = null;
    callEndedFiredRef.current = false;
    const member = getMember(calleeUserId);
    remoteUserIdRef.current = calleeUserId;
    chatIdRef.current = chatId;
    updateState({
      status: "calling", callType: type, chatId,
      remote: { userId: calleeUserId, username: member?.username ?? "User", avatarUrl: member?.avatarUrl },
      incomingCall: null,
    });
    try {
      // Fetch fresh TURN credentials from backend before creating peer connection
      const rtcConfig = tokenRef.current ? await fetchRtcConfig(tokenRef.current) : STUN_ONLY_CONFIG;
      const pc = createPeerConnection(rtcConfig);
      const stream = await getUserMedia(type);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await hubRef.current.invokeCall("InitiateCall", calleeUserId, chatId, type, JSON.stringify(offer));
    } catch (err) {
      console.error("Failed to start call:", err);
      cleanupCall(false);
    }
  }, [myUserId, getMember, createPeerConnection, getUserMedia, cleanupCall, updateState]);

  const acceptCall = useCallback(async () => {
    if (!hubRef.current || !callState.incomingCall) return;
    const { callerId, chatId, callType, sdpOffer } = callState.incomingCall;
    isCallerRef.current = false;
    callTypeRef.current = callType;
    currentChatIdRef.current = chatId;
    callStartTimeRef.current = Date.now();
    callEndedFiredRef.current = false;
    remoteUserIdRef.current = callerId;
    chatIdRef.current = chatId;
    try {
      // Fetch fresh TURN credentials from backend before creating peer connection
      const rtcConfig = tokenRef.current ? await fetchRtcConfig(tokenRef.current) : STUN_ONLY_CONFIG;
      const pc = createPeerConnection(rtcConfig);
      const stream = await getUserMedia(callType);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sdpOffer)));
      await drainPendingCandidates(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await hubRef.current.invokeCall("AnswerCall", callerId, chatId, JSON.stringify(answer));
      const member = getMember(callerId);
      updateState({
        status: "in-call", incomingCall: null,
        remote: { userId: callerId, username: member?.username ?? "User", avatarUrl: member?.avatarUrl },
      });
    } catch (err) {
      console.error("Failed to accept call:", err);
      cleanupCall(false);
    }
  }, [callState.incomingCall, createPeerConnection, getUserMedia, drainPendingCandidates, getMember, updateState, cleanupCall]);

  const declineCall = useCallback(async () => {
    if (!hubRef.current || !callState.incomingCall) return;
    const { callerId, chatId } = callState.incomingCall;
    await hubRef.current.invokeCall("DeclineCall", callerId, chatId);
    cleanupCall(false);
  }, [callState.incomingCall, cleanupCall]);

  const hangup = useCallback(() => { cleanupCall(true); }, [cleanupCall]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !callStateRef.current.isMicOn;
    stream.getAudioTracks().forEach(t => { t.enabled = enabled; });
    updateState({ isMicOn: enabled });
  }, [updateState]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !callStateRef.current.isCameraOn;
    stream.getVideoTracks().forEach(t => { t.enabled = enabled; });
    updateState({ isCameraOn: enabled });
  }, [updateState]);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current || callStateRef.current.isScreenSharing) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screenStream;
      const [screenTrack] = screenStream.getVideoTracks();
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(screenTrack);
      // Update local preview
      if (localStreamRef.current) {
        const mixed = new MediaStream([screenTrack, ...localStreamRef.current.getAudioTracks()]);
        setLocalStream(mixed);
      }
      screenTrack.onended = () => stopScreenShare();
      updateState({ isScreenSharing: true });
    } catch (err) { console.error("Screen share failed:", err); }
  }, [updateState]);

  const stopScreenShare = useCallback(async () => {
    if (!pcRef.current || !callStateRef.current.isScreenSharing) return;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    if (cameraTrack) {
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(cameraTrack);
      if (localStreamRef.current) setLocalStream(localStreamRef.current);
    }
    updateState({ isScreenSharing: false });
  }, [updateState]);

  // ── SignalR event handlers ─────────────────────────────────────────────────

  useEffect(() => {
    if (!hub) return;

    const offIncoming = hub.onCall("IncomingCall", (raw) => {
      const payload = parsePayload<{ callerId: string; chatId: string; callType: CallType; sdpOffer: string }>(raw);
      if (callStateRef.current.status !== "idle") {
        hubRef.current?.invokeCall("BusyCall", payload.callerId, payload.chatId);
        return;
      }
      pendingCandidatesRef.current = [];
      const member = getMember(payload.callerId);
      setCallState(prev => ({
        ...prev, status: "ringing", callType: payload.callType, chatId: payload.chatId,
        incomingCall: {
          callerId: payload.callerId, callerUsername: member?.username ?? "Someone",
          callerAvatarUrl: member?.avatarUrl, chatId: payload.chatId,
          callType: payload.callType, sdpOffer: payload.sdpOffer,
        },
      }));
    });

    const offAnswered = hub.onCall("CallAnswered", async (raw) => {
      const payload = parsePayload<{ calleeId: string; chatId: string; sdpAnswer: string }>(raw);
      const pc = pcRef.current;
      if (!pc) return;
      try {
        console.log("[WebRTC] Callee answered, setting remote description");
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(payload.sdpAnswer)));
        await drainPendingCandidates(pc);
        callStartTimeRef.current = Date.now();
        updateState({ status: "in-call" });
      } catch (err) { console.error("Failed to set remote description:", err); }
    });

    const offIce = hub.onCall("IceCandidate", async (raw) => {
      const payload = parsePayload<{ senderId: string; chatId: string; candidate: string }>(raw);
      try {
        const candidateData: RTCIceCandidateInit = JSON.parse(payload.candidate);
        if (!candidateData || !candidateData.candidate) return;
        const pc = pcRef.current;
        if (!pc || !pc.remoteDescription) {
          console.log("[WebRTC] Queueing ICE candidate (no pc or remoteDescription yet):", candidateData.candidate.slice(0, 45));
          pendingCandidatesRef.current.push(candidateData);
        } else {
          console.log("[WebRTC] Adding ICE candidate directly:", candidateData.candidate.slice(0, 45));
          await pc.addIceCandidate(new RTCIceCandidate(candidateData));
        }
      } catch (err) {
        console.warn("[WebRTC] ICE candidate error:", err);
      }
    });

    const offDeclined = hub.onCall("CallDeclined", () => {
      finalizeCall("declined");
      cleanupCall(false);
    });
    const offEnded = hub.onCall("CallEnded", () => {
      cleanupCall(false);
    });
    const offBusy = hub.onCall("CallBusy", () => {
      finalizeCall("busy");
      cleanupCall(false);
    });

    return () => { offIncoming(); offAnswered(); offIce(); offDeclined(); offEnded(); offBusy(); };
  }, [hub, getMember, updateState, cleanupCall, drainPendingCandidates, finalizeCall]);

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  return {
    callState, localStream, remoteStream,
    startCall, acceptCall, declineCall, hangup,
    toggleMic, toggleCamera, startScreenShare, stopScreenShare,
  };
}
