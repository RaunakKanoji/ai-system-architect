"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-surface-border bg-surface px-4">
      <div className="flex items-center justify-start">
        <Button
          aria-label={isSidebarOpen ? "Close projects" : "Open projects"}
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={onToggleSidebar}
        >
          <SidebarIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-sm font-medium text-copy-primary">AI System Architect</div>

      <div aria-hidden="true" />
    </header>
  );
}
