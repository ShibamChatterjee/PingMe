import { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
  InputAdornment,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import GifIcon from "@mui/icons-material/Gif";
import CloseIcon from "@mui/icons-material/Close";
import EmojiPickerReact, {
  Theme,
  EmojiStyle,
  type EmojiClickData,
} from "emoji-picker-react";

const TextFieldAny = TextField as any;

// Quick response reaction emojis for floating message bar
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🚀", "🎉"];

// Curated high-performance animated reaction GIFs (instant offline fallback + instant preview)
interface GifItem {
  id: string;
  title: string;
  category: string;
  url: string;
  previewUrl: string;
}

const CURATED_GIFS: GifItem[] = [
  // Trending & Celebrations
  {
    id: "g1",
    title: "Minions Cheering",
    category: "Celebrate",
    url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
    previewUrl: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif",
  },
  {
    id: "g2",
    title: "Leonardo DiCaprio Toast Cheers",
    category: "Celebrate",
    url: "https://media.giphy.com/media/GCLlQnV7dXY2KGmpBR/giphy.gif",
    previewUrl: "https://media.giphy.com/media/GCLlQnV7dXY2KGmpBR/200w.gif",
  },
  {
    id: "g3",
    title: "Confetti Celebration",
    category: "Celebrate",
    url: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif",
    previewUrl: "https://media.giphy.com/media/artj92V8o75VPL7AeQ/200w.gif",
  },

  // Thumbs Up & Approvals
  {
    id: "g4",
    title: "Thumbs Up Kid",
    category: "Thumbs Up",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/200w.gif",
  },
  {
    id: "g5",
    title: "Chuck Norris Thumbs Up",
    category: "Thumbs Up",
    url: "https://media.giphy.com/media/xUPGcC4A6ElcqtUJck/giphy.gif",
    previewUrl: "https://media.giphy.com/media/xUPGcC4A6ElcqtUJck/200w.gif",
  },

  // Applause & Clapping
  {
    id: "g6",
    title: "Leonardo DiCaprio Applause",
    category: "Applause",
    url: "https://media.giphy.com/media/7rj2ZgttvgomY/giphy.gif",
    previewUrl: "https://media.giphy.com/media/7rj2ZgttvgomY/200w.gif",
  },
  {
    id: "g7",
    title: "Orson Welles Standing Ovation",
    category: "Applause",
    url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif",
    previewUrl: "https://media.giphy.com/media/g9582DNuQppxC/200w.gif",
  },

  // Laugh & LOL
  {
    id: "g8",
    title: "Laughing Cat",
    category: "Laugh",
    url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
    previewUrl: "https://media.giphy.com/media/ICOgUNjpvO0PC/200w.gif",
  },
  {
    id: "g9",
    title: "Ryan Gosling Laughing",
    category: "Laugh",
    url: "https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/giphy.gif",
    previewUrl: "https://media.giphy.com/media/3oEjHAUOqG3lSS0f1C/200w.gif",
  },

  // Shocked & Mind Blown
  {
    id: "g10",
    title: "Mind Blown Galaxy",
    category: "Mind Blown",
    url: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif",
  },
  {
    id: "g11",
    title: "Surprised Pikachu",
    category: "Mind Blown",
    url: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/giphy.gif",
    previewUrl: "https://media.giphy.com/media/6nWhy3ulBL7GSCvKw6/200w.gif",
  },

  // Dance
  {
    id: "g12",
    title: "Carlton Dance",
    category: "Dance",
    url: "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif",
    previewUrl: "https://media.giphy.com/media/pa37AAGzKXoek/200w.gif",
  },
  {
    id: "g13",
    title: "Snoopy Happy Dance",
    category: "Dance",
    url: "https://media.giphy.com/media/o75ajIFH0QnQC3nCeD/giphy.gif",
    previewUrl: "https://media.giphy.com/media/o75ajIFH0QnQC3nCeD/200w.gif",
  },

  // Cats
  {
    id: "g14",
    title: "Vibing Cat Jam",
    category: "Cat",
    url: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif",
    previewUrl: "https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/200w.gif",
  },
  {
    id: "g15",
    title: "Typing Bongo Cat",
    category: "Cat",
    url: "https://media.giphy.com/media/ule4akeXnY9A50kDwu/giphy.gif",
    previewUrl: "https://media.giphy.com/media/ule4akeXnY9A50kDwu/200w.gif",
  },

  // Yes / Agreement
  {
    id: "g16",
    title: "Nodding Yes Robert Redford",
    category: "Yes",
    url: "https://media.giphy.com/media/KDVTAN0CycdPkJKY7g/giphy.gif",
    previewUrl: "https://media.giphy.com/media/KDVTAN0CycdPkJKY7g/200w.gif",
  },

  // Popcorn
  {
    id: "g17",
    title: "Michael Jackson Popcorn",
    category: "Popcorn",
    url: "https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif",
    previewUrl: "https://media.giphy.com/media/gl0mkIZOW6Nwc/200w.gif",
  },
];

const GIF_CATEGORIES = [
  "All",
  "Celebrate",
  "Thumbs Up",
  "Applause",
  "Laugh",
  "Mind Blown",
  "Dance",
  "Cat",
  "Yes",
  "Popcorn",
];

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectGif?: (gifUrl: string) => void;
  onClose?: () => void;
}

export function EmojiPicker({ onSelectEmoji, onSelectGif, onClose }: EmojiPickerProps) {
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";

  // Tab: 0 = Emojis (emoji-picker-react), 1 = GIFs
  const [topTab, setTopTab] = useState<0 | 1>(0);

  // GIF Search state
  const [gifSearch, setGifSearch] = useState("");
  const [selectedGifCategory, setSelectedGifCategory] = useState("All");
  const [liveGifs, setLiveGifs] = useState<GifItem[]>([]);
  const [loadingGifs, setLoadingGifs] = useState(false);
  const searchTimeoutRef = useRef<any>(null);

  // Fetch online GIFs if Tenor key is provided or search dynamically
  useEffect(() => {
    if (topTab !== 1) return;

    const tenorKey = (import.meta as any).env?.VITE_TENOR_API_KEY;
    const query = gifSearch.trim() || (selectedGifCategory === "All" ? "trending" : selectedGifCategory);

    if (!tenorKey) {
      setLiveGifs([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setLoadingGifs(true);
      try {
        const endpoint = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${tenorKey}&limit=16&media_filter=gif,tinygif`;
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (data.results && Array.isArray(data.results)) {
            const mapped: GifItem[] = data.results.map((r: any) => ({
              id: r.id,
              title: r.content_description || "GIF",
              category: query,
              url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
              previewUrl: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
            })).filter((g: GifItem) => !!g.url);
            setLiveGifs(mapped);
          }
        }
      } catch {
        // Graceful fallback to curated GIFs
        setLiveGifs([]);
      } finally {
        setLoadingGifs(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [gifSearch, selectedGifCategory, topTab]);

  // Combined GIFs: Live API results or curated collection
  const displayedGifs = useMemo(() => {
    if (liveGifs.length > 0) return liveGifs;

    let filtered = CURATED_GIFS;
    if (selectedGifCategory !== "All") {
      filtered = filtered.filter((g) => g.category.toLowerCase() === selectedGifCategory.toLowerCase());
    }
    if (gifSearch.trim()) {
      const q = gifSearch.toLowerCase().trim();
      filtered = filtered.filter((g) => g.title.toLowerCase().includes(q) || g.category.toLowerCase().includes(q));
    }
    return filtered;
  }, [liveGifs, selectedGifCategory, gifSearch]);

  const handleGifClick = (gifUrl: string) => {
    if (onSelectGif) {
      onSelectGif(gifUrl);
    } else {
      // Fallback: pass URL as emoji/text to onSelectEmoji
      onSelectEmoji(gifUrl);
    }
    if (onClose) onClose();
  };

  return (
    <Paper
      elevation={8}
      sx={{
        width: 350,
        height: 440,
        display: "flex",
        flexDirection: "column",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {/* Top Header Mode Switcher: Emojis vs GIFs */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
        }}
      >
        <Tabs
          value={topTab}
          onChange={(_, val) => setTopTab(val)}
          sx={{
            minHeight: 32,
            "& .MuiTab-root": {
              minHeight: 32,
              py: 0.25,
              px: 1.5,
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "none",
              borderRadius: "6px",
              gap: 0.75,
            },
            "& .MuiTabs-indicator": {
              height: 2,
              borderRadius: "2px",
            },
          }}
        >
          <Tab
            icon={<SentimentSatisfiedAltIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label="Emojis"
          />
          <Tab
            icon={<GifIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="GIFs"
          />
        </Tabs>

        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ p: 0.5, color: "text.secondary" }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Box>

      {/* TAB 0: Dynamic Emoji Picker Library */}
      {topTab === 0 && (
        <Box sx={{ flexGrow: 1, height: "calc(100% - 44px)", overflow: "hidden" }}>
          <EmojiPickerReact
            onEmojiClick={(data: EmojiClickData) => {
              onSelectEmoji(data.emoji);
              if (onClose) onClose();
            }}
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            emojiStyle={EmojiStyle.NATIVE}
            lazyLoadEmojis={true}
            searchPlaceHolder="Search all emojis..."
            width="100%"
            height="100%"
            previewConfig={{
              showPreview: false,
            }}
          />
        </Box>
      )}

      {/* TAB 1: Animated GIFs Picker */}
      {topTab === 1 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            height: "calc(100% - 44px)",
            overflow: "hidden",
          }}
        >
          {/* GIF Search Bar */}
          <Box sx={{ p: 1.25, pb: 0.75 }}>
            <TextFieldAny
              size="small"
              placeholder="Search reaction GIFs..."
              value={gifSearch}
              onChange={(e: any) => setGifSearch(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                sx: {
                  height: 32,
                  fontSize: "12.5px",
                  borderRadius: "8px",
                },
              }}
            />
          </Box>

          {/* Quick Category Chips */}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              px: 1.25,
              pb: 1,
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {GIF_CATEGORIES.map((cat) => {
              const active = selectedGifCategory === cat && !gifSearch.trim();
              return (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  clickable
                  onClick={() => {
                    setSelectedGifCategory(cat);
                    setGifSearch("");
                  }}
                  sx={{
                    height: 22,
                    fontSize: "11px",
                    fontWeight: active ? 700 : 500,
                    bgcolor: active ? "primary.main" : "action.hover",
                    color: active ? "primary.contrastText" : "text.secondary",
                    "&:hover": {
                      bgcolor: active ? "primary.dark" : "action.selected",
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* GIFs Grid */}
          <Box
            sx={{
              flexGrow: 1,
              overflowY: "auto",
              px: 1.25,
              pb: 1.25,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 1,
              alignContent: "flex-start",
            }}
          >
            {loadingGifs ? (
              <Box sx={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : displayedGifs.length === 0 ? (
              <Box sx={{ gridColumn: "1 / -1", textAlign: "center", py: 4 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No GIFs found.
                </Typography>
              </Box>
            ) : (
              displayedGifs.map((gif) => (
                <Tooltip key={gif.id} title={gif.title} arrow enterDelay={400}>
                  <Box
                    onClick={() => handleGifClick(gif.url)}
                    sx={{
                      position: "relative",
                      borderRadius: "8px",
                      overflow: "hidden",
                      cursor: "pointer",
                      height: 100,
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                      "&:hover": {
                        transform: "scale(1.03)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        borderColor: "primary.main",
                        zIndex: 2,
                      },
                    }}
                  >
                    <img
                      src={gif.previewUrl || gif.url}
                      alt={gif.title}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </Box>
                </Tooltip>
              ))
            )}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
