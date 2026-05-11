"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Bot, Download, FileText, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  content: string;
  id: number;
  role: "assistant" | "user";
}

const starterPrompts = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextMessageId = useRef(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "72px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [draft]);

  function sendMessage(content: string) {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        content: trimmedContent,
        id: nextMessageId.current++,
        role: "user",
      },
      {
        content:
          "Ghost AI will use this prompt to generate architecture changes once generation is connected.",
        id: nextMessageId.current++,
        role: "assistant",
      },
    ]);
    setDraft("");
  }

  function handleSubmit() {
    sendMessage(draft);
  }

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <aside
      className={cn(
        "absolute bottom-4 right-4 top-4 z-30 hidden w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-base/95 shadow-2xl backdrop-blur transition-all duration-200 ease-out lg:flex",
        isOpen
          ? "translate-x-0 opacity-100"
          : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0",
      )}
      aria-hidden={!isOpen}
    >
      <div className="flex items-start gap-3 border-b border-surface-border px-4 py-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-ai/40 bg-ai/15 text-ai-text">
          <Bot className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-medium text-copy-primary">
            AI Workspace
          </h2>
          <p className="text-xs text-copy-muted">Collaborate with Ghost AI</p>
        </div>
        <Button
          aria-label="Close AI sidebar"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs className="min-h-0 flex-1 gap-0" defaultValue="architect">
        <div className="border-b border-surface-border px-4 py-3">
          <TabsList className="grid h-9 w-full grid-cols-2 bg-subtle">
            <TabsTrigger
              className="text-copy-muted data-active:bg-ai data-active:text-copy-primary"
              value="architect"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              className="text-copy-muted data-active:bg-ai data-active:text-copy-primary"
              value="specs"
            >
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          className="min-h-0 flex-1 flex-col data-active:flex"
          value="architect"
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl border border-ai/40 bg-ai/15 text-ai-text">
                  <Bot className="h-8 w-8" />
                </div>
                <p className="max-w-60 text-sm leading-6 text-copy-muted">
                  Describe the system you want to design and Ghost AI will help
                  shape the architecture.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      className="rounded-full bg-subtle px-3 py-1.5 text-xs font-medium text-ai-text transition-colors hover:bg-elevated"
                      key={prompt}
                      type="button"
                      onClick={() => setDraft(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                  key={message.id}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6",
                      message.role === "user"
                        ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
                        : "border border-surface-border bg-elevated text-ai-text",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-surface-border p-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                className="max-h-40 min-h-[72px] resize-none overflow-y-auto border-surface-border bg-elevated text-sm text-copy-primary placeholder:text-copy-muted focus-visible:border-ai focus-visible:ring-ai/30"
                placeholder="Ask Ghost AI to design or refine this system..."
                value={draft}
                onChange={handleDraftChange}
                onKeyDown={handleTextareaKeyDown}
              />
              <Button
                aria-label="Send message"
                className="bg-ai text-copy-primary hover:bg-ai/90"
                disabled={!draft.trim()}
                size="icon"
                type="button"
                onClick={handleSubmit}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          className="min-h-0 flex-1 p-4 data-active:block"
          value="specs"
        >
          <div className="space-y-4">
            <Button
              className="w-full bg-ai text-copy-primary hover:bg-ai/90"
              type="button"
            >
              Generate Spec
            </Button>

            <article className="rounded-2xl border border-surface-border bg-elevated p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-surface-border bg-subtle text-ai-text">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-copy-primary">
                    Architecture Spec
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-copy-muted">
                    Static preview of the generated system design document.
                  </p>
                </div>
                <Button
                  aria-label="Download spec"
                  disabled
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </article>
          </div>
        </TabsContent>
      </Tabs>
    </aside>
  );
}
