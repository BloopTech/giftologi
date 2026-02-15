"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { cx } from "./utils";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  ExternalLink,
} from "lucide-react";

export default function RichTextEditor({ value, onChange, className, placeholder }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const linkInputRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        linkOnPaste: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none text-xs text-[#0A0A0A] dark:text-gray-300 min-h-[140px]",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) onChange(html);
    },
    immediatelyRender: true,
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((value || "") !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  // Focus link input when dialog opens
  useEffect(() => {
    if (linkDialogOpen && linkInputRef.current) {
      setTimeout(() => linkInputRef.current?.focus(), 50);
    }
  }, [linkDialogOpen]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    
    // Check if already has a link
    const existingLink = editor.getAttributes("link").href;
    
    setLinkText(selectedText || "");
    setLinkUrl(existingLink || "");
    setLinkDialogOpen(true);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;
    
    // Ensure URL has protocol
    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      url = `https://${url}`;
    }

    if (linkText && editor.state.selection.empty) {
      // Insert new link with text
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${url}">${linkText}</a>`)
        .run();
    } else {
      // Set link on selection
      editor.chain().focus().setLink({ href: url }).run();
    }
    
    setLinkDialogOpen(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText]);

  const unsetLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={cx(
          "w-full rounded-2xl border px-4 py-3 text-xs shadow-sm bg-white dark:bg-gray-900 border-[#D6D6D6] dark:border-gray-700 text-[#0A0A0A] dark:text-gray-300",
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
        "w-full rounded-2xl border text-xs shadow-sm bg-white dark:bg-gray-900 border-[#D6D6D6] dark:border-gray-700 overflow-hidden",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB] dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-1">
          <ToolbarButton
            editor={editor}
            command="toggleBold"
            isActive={editor.isActive("bold")}
            icon={Bold}
            label="Bold"
          />
          <ToolbarButton
            editor={editor}
            command="toggleItalic"
            isActive={editor.isActive("italic")}
            icon={Italic}
            label="Italic"
          />
          <ToolbarButton
            editor={editor}
            command="toggleBulletList"
            isActive={editor.isActive("bulletList")}
            icon={List}
            label="Bullet List"
          />
          <ToolbarButton
            editor={editor}
            command="toggleOrderedList"
            isActive={editor.isActive("orderedList")}
            icon={ListOrdered}
            label="Numbered List"
          />
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1 self-center" />
          <LinkToolbarButton
            editor={editor}
            onClick={openLinkDialog}
            isActive={editor.isActive("link")}
          />
          {editor.isActive("link") && (
            <ToolbarButton
              editor={editor}
              command="unsetLink"
              onClick={unsetLink}
              isActive={false}
              icon={Unlink}
              label="Remove Link"
              variant="danger"
            />
          )}
        </div>
        {placeholder ? (
          <span className="text-[10px] text-[#9CA3AF] truncate max-w-[40%] text-right hidden sm:block">
            {placeholder}
          </span>
        ) : null}
      </div>

      {/* Editor Content */}
      <div className="px-3 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Link Dialog */}
      {linkDialogOpen && (
        <div className="border-t border-[#E5E7EB] dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <LinkIcon className="size-3" />
                Insert Link
              </span>
              <button
                type="button"
                onClick={() => setLinkDialogOpen(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
            <div className="flex gap-2">
              <input
                ref={linkInputRef}
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setLink();
                  }
                  if (e.key === "Escape") {
                    setLinkDialogOpen(false);
                  }
                }}
                placeholder="https://example.com"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-[#A5914B]/30 focus:border-[#A5914B]"
              />
              <button
                type="button"
                onClick={setLink}
                disabled={!linkUrl.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-[#A5914B] rounded-lg
                  hover:bg-[#8B7A3F] disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors flex items-center gap-1"
              >
                <ExternalLink className="size-3" />
                Add
              </button>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Tip: Select text first to make it a link, or type a URL to insert.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ editor, command, onClick, isActive, icon: Icon, label, variant = "default" }) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (editor) {
      editor.chain().focus()[command]().run();
    }
  };

  const isDisabled = () => {
    if (!editor) return true;
    if (command === "toggleBold") return !editor.can().chain().focus().toggleBold().run();
    if (command === "toggleItalic") return !editor.can().chain().focus().toggleItalic().run();
    if (command === "toggleBulletList") return !editor.can().chain().focus().toggleBulletList().run();
    if (command === "toggleOrderedList") return !editor.can().chain().focus().toggleOrderedList().run();
    return false;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled()}
      title={label}
      className={cx(
        "p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        variant === "danger" && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
        variant === "default" && isActive && "bg-[#A5914B] text-white shadow-sm",
        variant === "default" && !isActive && "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function LinkToolbarButton({ editor, onClick, isActive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Add Link (Ctrl+K)"
      className={cx(
        "p-1.5 rounded-lg transition-all duration-150",
        isActive
          ? "bg-[#A5914B] text-white shadow-sm"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200"
      )}
    >
      <LinkIcon className="size-4" />
    </button>
  );
}
