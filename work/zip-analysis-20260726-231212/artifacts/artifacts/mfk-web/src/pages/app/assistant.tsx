import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Send, Bot, User, Sparkles, AlertTriangle, Calendar, Wrench, Car, Search } from "lucide-react";
import { 
  useListVehicles, 
  useAiChat,
  AiChatResponseSuggestedActionsItem
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AiChatResponseSuggestedActionsItem[];
};

export default function Assistant() {
  const [vehicleId, setVehicleId] = useState<string>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: vehicles } = useListVehicles();
  const aiChat = useAiChat();
  const { toast } = useToast();

  const [input, setInput] = useState("");

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");

    aiChat.mutate({ 
      data: { 
        message: userMsg.content,
        vehicleId: vehicleId === "general" ? undefined : vehicleId 
      } 
    }, {
      onSuccess: (response) => {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: response.reply,
          actions: response.suggestedActions
        };
        setMessages(prev => [...prev, assistantMsg]);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء معالجة الطلب", variant: "destructive" });
      }
    });
  };

  const getActionIcon = (kind?: string) => {
    switch (kind) {
      case "book_workshop": return <Calendar className="w-3 h-3 mr-1" />;
      case "view_dtc": return <AlertTriangle className="w-3 h-3 mr-1" />;
      case "schedule_maintenance": return <Wrench className="w-3 h-3 mr-1" />;
      case "view_vehicle": return <Car className="w-3 h-3 mr-1" />;
      default: return <Search className="w-3 h-3 mr-1" />;
    }
  };

  const suggestions = [
    "ليش حرارة سيارتي عالية؟",
    "متى أغيّر الزيت؟",
    "كيف أحجز فحص دوري؟",
    "وش معنى علامة المكينة؟"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المساعد الذكي</h1>
          <p className="text-muted-foreground mt-1">اسأل MFK عن أي شيء يخص سيارتك</p>
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger>
              <SelectValue placeholder="سياق الحديث" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">أسئلة عامة</SelectItem>
              {vehicles?.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nickname || `${v.make} ${v.model}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card/50">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">كيف يمكنني مساعدتك اليوم؟</h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                أنا المساعد الذكي لـ MFK، يمكنني تحليل أعطال مركبتك، تذكيرك بمواعيد الصيانة، أو الإجابة على استفساراتك حول السيارات.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {suggestions.map((text, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="px-4 py-2 cursor-pointer hover:bg-secondary/80 text-sm font-normal"
                    onClick={() => { setInput(text); }}
                  >
                    {text}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto w-full pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-4 w-full", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="shrink-0 w-10 h-10 border border-border">
                    {msg.role === "user" ? (
                      <AvatarFallback className="bg-muted text-foreground"><User className="w-5 h-5"/></AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-5 h-5"/></AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn("flex flex-col gap-2 max-w-[85%] md:max-w-[75%]", msg.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn(
                      "p-4 rounded-2xl whitespace-pre-wrap leading-relaxed", 
                      msg.role === "user" 
                        ? "bg-primary text-primary-foreground rounded-tr-sm" 
                        : "bg-card border border-border shadow-sm rounded-tl-sm text-foreground"
                    )}>
                      {msg.content}
                    </div>
                    
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {msg.actions.map((action, i) => (
                          <Badge key={i} variant="outline" className="bg-background cursor-pointer hover:bg-muted py-1.5 px-3 border-primary/30 text-primary">
                            {getActionIcon(action.kind)}
                            {action.labelAr}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {aiChat.isPending && (
                <div className="flex gap-4 w-full">
                  <Avatar className="shrink-0 w-10 h-10 border border-border">
                    <AvatarFallback className="bg-primary/10 text-primary"><Bot className="w-5 h-5"/></AvatarFallback>
                  </Avatar>
                  <div className="p-4 rounded-2xl rounded-tl-sm bg-card border border-border shadow-sm flex gap-1 items-center">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-border bg-background/50">
          <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto w-full relative">
            <Input 
              value={input} 
              onChange={e => setInput(e.target.value)}
              placeholder="اكتب رسالتك هنا..." 
              className="flex-1 pr-4 pl-12 h-14 rounded-full bg-background border-border shadow-sm focus-visible:ring-primary"
              disabled={aiChat.isPending}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="absolute left-2 top-2 h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!input.trim() || aiChat.isPending}
            >
              <Send className="h-5 w-5 -ml-1" />
            </Button>
          </form>
          <div className="text-center mt-2 text-xs text-muted-foreground">
            المساعد الذكي قد يخطئ في بعض الأحيان. يرجى مراجعة التوصيات مع فني مختص.
          </div>
        </div>
      </Card>
    </div>
  );
}
