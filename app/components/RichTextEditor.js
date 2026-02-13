"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cx } from "./utils";

export default function RichTextEditor({ value, onChange, className, placeholder }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none text-xs text-[#0A0A0A] min-h-[140px]",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) onChange(html);
    },
    immediatelyRender: true
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cx(
          "w-full rounded-2xl border px-4 py-3 text-xs shadow-sm bg-white border-[#D6D6D6] text-[#0A0A0A]",
          className
        )}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={cx(
        "w-full rounded-2xl border px-3 py-2 text-xs shadow-sm bg-white border-[#D6D6D6]",
        className
      )}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex flex-wrap gap-1">
          <ToolbarButton editor={editor} command="toggleBold" label="B" />
          <ToolbarButton editor={editor} command="toggleItalic" label="I" />
          <ToolbarButton editor={editor} command="toggleBulletList" label="• List" />
          <ToolbarButton editor={editor} command="toggleOrderedList" label="1. List" />
        </div>
        {placeholder ? (
          <span className="text-[10px] text-[#9CA3AF] truncate max-w-[50%] text-right">
            {placeholder}
          </span>
        ) : null}
      </div>
      <div className="border-t border-[#E5E7EB] pt-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({ editor, command, label }) {
  const isActive = () => {
    if (!editor) return false;
    switch (command) {
      case "toggleBold":
        return editor.isActive("bold");
      case "toggleItalic":
        return editor.isActive("italic");
      case "toggleBulletList":
        return editor.isActive("bulletList");
      case "toggleOrderedList":
        return editor.isActive("orderedList");
      default:
        return false;
    }
  };

  const handleClick = () => {
    if (!editor) return;
    editor.chain().focus()[command]().run();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cx(
        "px-2 py-1 rounded-full border text-[10px] cursor-pointer",
        isActive()
          ? "bg-primary border-primary text-white"
          : "border-[#E5E7EB] text-[#4B5563] bg-white hover:bg-[#F3F4F6]"
      )}
    >
      {label}
    </button>
  );
}
