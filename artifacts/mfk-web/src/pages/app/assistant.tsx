import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, AlertTriangle, Calendar, Wrench, Car, Search, Copy, Check, Mic, MicOff, ImagePlus, X, Trash2, ChevronDown } from "lucide-react";
import {
  useListVehicles,
  useAiChat,
  AiChatResponseSuggestedActionsItem
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  actions?: AiChatResponseSuggestedActionsItem[];
  timestamp: number;
  isTyping?: boolean;
};

const STORAGE_KEY = "mfk_chat_history";

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────

function MarkdownContent({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-lg font-bold mt-2 mb-1">{renderInline(line.slice(3))}</h2>);
      i++; continue;
    }
    // H3
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-semibold mt-3 mb-1 text-primary/90">{renderInline(line.slice(4))}</h3>);
      i++; continue;
    }
    // HR
    if (line.startsWith("---")) {
      elements.push(<hr key={i} className="my-2 border-border" />);
      i++; continue;
    }
    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-r-4 border-primary/40 pr-3 my-2 text-muted-foreground italic text-sm">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++; continue;
    }
    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter(l => !l.match(/^\|[-| ]+\|$/));
      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="text-sm border-collapse w-full">
            {rows.map((row, ri) => {
              const cells = row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1);
              return (
                <tr key={ri} className={ri === 0 ? "border-b-2 border-border font-semibold bg-muted/40" : "border-b border-border/50 hover:bg-muted/20"}>
                  {cells.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5">{renderInline(cell.trim())}</td>
                  ))}
                </tr>
              );
            })}
          </table>
        </div>
      );
      continue;
    }
    // Ordered list item
    if (/^\d+\. /.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside my-2 space-y-1 text-sm">
          {listItems.map((item, li) => <li key={li}>{renderInline(item)}</li>)}
        </ol>
      );
      continue;
    }
    // Unordered list item
    if (line.startsWith("- ")) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-none my-2 space-y-1 text-sm">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }
    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-1" />);
      i++; continue;
    }
    // Regular paragraph
    elements.push(<p key={i} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|~~[^~]+~~)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    if (part.startsWith("~~") && part.endsWith("~~"))
      return <del key={i}>{part.slice(2, -2)}</del>;
    return part;
  });
}

// ─── Typing Animation ─────────────────────────────────────────────────────────

function TypingMessage({ content, onDone }: { content: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const ref = useRef(0);

  useEffect(() => {
    ref.current = 0;
    setDisplayed("");
    setDone(false);

    const speed = content.length > 300 ? 8 : 18;

    const interval = setInterval(() => {
      ref.current += 3;
      if (ref.current >= content.length) {
        setDisplayed(content);
        setDone(true);
        clearInterval(interval);
        onDone();
      } else {
        setDisplayed(content.slice(0, ref.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content]);

  return done ? <MarkdownContent text={content} /> : (
    <div>
      <MarkdownContent text={displayed} />
      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse rounded-sm ml-0.5 align-middle" />
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground"
      title="نسخ"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Action Icons ─────────────────────────────────────────────────────────────

function getActionIcon(kind?: string) {
  switch (kind) {
    case "book_workshop": return <Calendar className="w-3.5 h-3.5" />;
    case "view_dtc": return <AlertTriangle className="w-3.5 h-3.5" />;
    case "schedule_maintenance": return <Wrench className="w-3.5 h-3.5" />;
    case "view_vehicle": return <Car className="w-3.5 h-3.5" />;
    default: return <Search className="w-3.5 h-3.5" />;
  }
}


function getActionHref(kind?: string) {
  switch (kind) {
    case "view_dtc":
      return "/app/dtc";
    case "schedule_maintenance":
      return "/app/maintenance";
    case "view_vehicle":
      return "/app/vehicles";
    case "view_fuel":
      return "/app/fuel";
    case "book_workshop":
      return "/app/maintenance";
    default:
      return "/app";
  }
}


// ─── Suggestion Categories ────────────────────────────────────────────────────

const SUGGESTION_GROUPS = [
  {
    label: "أكواد أعطال شائعة",
    items: ["عندي كود P0300 تفتفة", "وش معنى كود P0420؟", "كود P0171 وش يعني؟"],
  },
  {
    label: "تحذيرات خطرة",
    items: ["لمبة الزيت الحمراء ولعت", "سيارتي بدأت تسخن — وش أسوي؟", "كود P0700 القير"],
  },
  {
    label: "صيانة وخدمات",
    items: ["وش جدول الصيانة الدورية؟", "متى أغيّر الفرامل؟", "أبي أحجز ورشة"],
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Assistant() {
  const [vehicleId, setVehicleId] = useState<string>("general");
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const { data: vehicles } = useListVehicles();
  const aiChat = useAiChat();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Persist messages
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50))); }
    catch {}
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const scrollToBottom = useCallback((smooth = true) => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTo({ top: viewport.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, typingId]);

  const handleScroll = useCallback(() => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;
    const distFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
  }, []);

  // Voice input
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "المتصفح لا يدعم الإدخال الصوتي" });
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      setInput(prev => prev + e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = (text?: string) => {
    const content = (text || input).trim();
    if (!content && !imageUrl) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      imageUrl: imageUrl || undefined,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    aiChat.mutate({
      data: {
        message: content || "أرسل صورة",
        vehicleId: vehicleId === "general" ? undefined : vehicleId,
      }
    }, {
      onSuccess: (response) => {
        const id = (Date.now() + 1).toString();
        const assistantMsg: Message = {
          id,
          role: "assistant",
          content: response.reply,
          actions: response.suggestedActions,
          timestamp: Date.now(),
          isTyping: true,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setTypingId(id);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء معالجة الطلب", variant: "destructive" });
      }
    });
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">المساعد الذكي</h1>
            <p className="text-muted-foreground text-sm">اسأل MFK عن أي شيء يخص سيارتك</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              مسح المحادثة
            </Button>
          )}
          <div className="w-52">
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="سياق الحديث" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">🔍 أسئلة عامة</SelectItem>
                {vehicles?.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    🚗 {v.nickname || `${v.make} ${v.model}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden border-border relative">
        <ScrollArea
          className="flex-1 px-4 py-4"
          ref={scrollRef}
          onScrollCapture={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Bot className="w-10 h-10" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">كيف يمكنني مساعدتك اليوم؟</h2>
              <p className="text-muted-foreground mb-8 max-w-sm text-sm leading-relaxed">
                أنا مساعدك الذكي من MFK — يمكنني تشخيص أعطال سيارتك، شرح الأكواد، وجدولة الصيانة
              </p>

              <div className="w-full max-w-xl space-y-4">
                {SUGGESTION_GROUPS.map((group, gi) => (
                  <div key={gi} className="text-right">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-1">{group.label}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {group.items.map((text, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(text)}
                          className="px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/40 text-sm transition-colors"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3 w-full group", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="shrink-0 w-8 h-8 border border-border mt-1">
                    {msg.role === "user"
                      ? <AvatarFallback className="bg-primary text-primary-foreground text-xs"><User className="w-4 h-4" /></AvatarFallback>
                      : <AvatarFallback className="bg-primary/10 text-primary text-xs"><Bot className="w-4 h-4" /></AvatarFallback>
                    }
                  </Avatar>

                  <div className={cn("flex flex-col gap-1 max-w-[85%] md:max-w-[78%]", msg.role === "user" ? "items-end" : "items-start")}>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="صورة مرفقة" className="max-w-[220px] rounded-xl border border-border mb-1" />
                    )}

                    <div className={cn(
                      "px-4 py-3 rounded-2xl relative",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border shadow-sm rounded-tl-sm"
                    )}>
                      {msg.role === "assistant" ? (
                        msg.isTyping && typingId === msg.id ? (
                          <TypingMessage
                            content={msg.content}
                            onDone={() => {
                              setTypingId(null);
                              setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isTyping: false } : m));
                            }}
                          />
                        ) : (
                          <MarkdownContent text={msg.content} />
                        )
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {msg.role === "assistant" && (
                        <div className="absolute top-2 left-2">
                          <CopyButton text={msg.content} />
                        </div>
                      )}
                    </div>

                  {msg.actions && msg.actions.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-2">
    {msg.actions.map((action, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setLocation(getActionHref(action.kind))}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
      >
        {getActionIcon(action.kind)}
        {action.labelAr}
      </button>
    ))}
  </div>
)}

                    <span className="text-[10px] text-muted-foreground/60 px-1">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              ))}

              {aiChat.isPending && (
                <div className="flex gap-3 w-full">
                  <Avatar className="shrink-0 w-8 h-8 border border-border mt-1">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs"><Bot className="w-4 h-4" /></AvatarFallback>
                  </Avatar>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border shadow-sm flex gap-1.5 items-center">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-background border border-border shadow-md rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted flex items-center gap-1 z-10"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            اسحب للأسفل
          </button>
        )}

        {/* Input area */}
        <div className="p-3 border-t border-border bg-background/60 backdrop-blur-sm shrink-0">
          {imageUrl && (
            <div className="relative inline-block mb-2 mr-1">
              <img src={imageUrl} alt="مرفق" className="h-16 rounded-lg border border-border" />
              <button
                onClick={() => { setImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            {/* Attachments */}
            <div className="flex gap-1 shrink-0 pb-1.5">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="إرفاق صورة"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <button
                onClick={toggleVoice}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  isListening
                    ? "text-red-500 bg-red-50 dark:bg-red-950/30 animate-pulse"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                title={isListening ? "إيقاف التسجيل" : "إدخال صوتي"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="اكتب رسالتك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
                rows={1}
                disabled={aiChat.isPending}
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 min-h-[44px] max-h-[160px]"
              />
            </div>

            {/* Send */}
            <Button
              onClick={() => handleSend()}
              size="icon"
              className="shrink-0 h-11 w-11 rounded-2xl mb-0"
              disabled={(!input.trim() && !imageUrl) || aiChat.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-center mt-1.5 text-[10px] text-muted-foreground/60">
            المساعد الذكي قد يخطئ أحياناً — يُرجى مراجعة التوصيات مع فني مختص
          </p>
        </div>
      </Card>
    </div>
  );
}
