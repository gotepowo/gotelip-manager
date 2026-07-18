import React from "react";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title, description, children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">{description}</p>}
      {children}
    </div>
  );
}