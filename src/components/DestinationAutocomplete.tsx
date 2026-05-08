"use client";

// Typeahead destination input. Hits destinationSuggestions(query) every
// 200ms while the guest types, shows results in a Popover-portaled
// dropdown grouped by type (Cities / Countries / Hotels), supports
// keyboard nav (↑/↓/Enter/Esc), and on click either pre-fills the
// destination input or deep-links straight to the chosen hotel's rate
// page.
//
// Pure logic (group ordering, debounce constants, keyboard math) lives in
// lib/autocomplete and is unit-tested there. This component is the thin
// React adapter on top.

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_DEBOUNCE_MS,
  destinationFor,
  flattenGroups,
  groupSuggestions,
  MIN_QUERY_LENGTH,
  nextHighlightedIndex,
  type SuggestionGroup,
} from "@/lib/autocomplete";
import { gqlFetch } from "@/lib/graphql";
import { DESTINATION_SUGGESTIONS_QUERY } from "@/lib/queries";
import type { DestinationSuggestion } from "@/types/graphql";
import { Popover } from "./Popover";

type Resp = { destinationSuggestions: DestinationSuggestion[] };

export function DestinationAutocomplete({
  name = "destination",
  defaultValue = "",
  placeholder = "Where would you like to go?",
  theme = "cream",
  inputClassName,
  /** Optional click-handler — falls back to fill-then-let-form-submit. */
  onSelect,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  theme?: "cream" | "ink";
  inputClassName?: string;
  onSelect?: (s: DestinationSuggestion) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<SuggestionGroup[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [loading, setLoading] = useState(false);

  // Debounced fetch: re-fires only after 200ms of typing-quiet.
  useEffect(() => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setGroups([]);
      setHighlighted(-1);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const data = await gqlFetch<Resp>(DESTINATION_SUGGESTIONS_QUERY, {
          query: value.trim(),
          limit: 10,
        });
        if (cancelled) return;
        setGroups(groupSuggestions(data.destinationSuggestions));
        setHighlighted(-1);
      } catch {
        if (cancelled) return;
        setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEFAULT_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [value]);

  const flatItems = flattenGroups(groups);

  function pick(suggestion: DestinationSuggestion) {
    const { text, hotelId } = destinationFor(suggestion);
    setValue(text);
    setOpen(false);
    if (onSelect) {
      onSelect(suggestion);
      return;
    }
    if (suggestion.type === "HOTEL" && hotelId) {
      router.push(`/hotels/${hotelId}/rates`);
    }
    // Otherwise the user picked a city/country — leave the value in the
    // input and let them submit the surrounding form.
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || flatItems.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlighted((i) => nextHighlightedIndex(i, flatItems.length, "down"));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlighted((i) => nextHighlightedIndex(i, flatItems.length, "up"));
        break;
      case "Enter":
        if (highlighted >= 0) {
          e.preventDefault();
          pick(flatItems[highlighted]);
        }
        break;
      case "Escape":
        setOpen(false);
        break;
    }
  }

  const fieldBg = theme === "ink" ? "bg-ink/40 text-cream" : "bg-cream text-ink";
  const labelClr = theme === "ink" ? "text-cream/70" : "text-ink/60";

  return (
    <div className={`block ${fieldBg} px-5 py-3`}>
      <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClr} mb-1`}>
        Destination
      </div>
      <input
        ref={inputRef}
        type="text"
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay close so a click on a list item still registers.
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        className={`w-full bg-transparent text-sm py-1 focus:outline-none ${inputClassName ?? ""}`}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={highlighted >= 0 ? `${listboxId}-${highlighted}` : undefined}
      />

      <Popover
        anchorRef={inputRef}
        open={open && (groups.length > 0 || loading)}
        onClose={() => setOpen(false)}
      >
        <ul
          id={listboxId}
          role="listbox"
          className="bg-cream border border-ink/10 shadow-xl w-[26rem] max-h-[28rem] overflow-y-auto"
        >
          {loading && groups.length === 0 && (
            <li className="px-4 py-3 text-sm text-ink/55">Searching…</li>
          )}
          {!loading && groups.length === 0 && value.trim().length >= MIN_QUERY_LENGTH && (
            <li className="px-4 py-3 text-sm text-ink/55">
              No destinations match &ldquo;{value}&rdquo;.
            </li>
          )}
          {groups.map((group) => {
            const offset = flatItems.indexOf(group.items[0]);
            return (
              <SuggestionGroupSection
                key={group.type}
                group={group}
                offset={offset}
                highlighted={highlighted}
                listboxId={listboxId}
                onPick={pick}
                onHover={setHighlighted}
              />
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}

function SuggestionGroupSection({
  group,
  offset,
  highlighted,
  listboxId,
  onPick,
  onHover,
}: {
  group: SuggestionGroup;
  offset: number;
  highlighted: number;
  listboxId: string;
  onPick: (s: DestinationSuggestion) => void;
  onHover: (i: number) => void;
}) {
  return (
    <>
      <li className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-[0.2em] text-ink/45">
        {group.heading}
      </li>
      {group.items.map((item, i) => {
        const flatIndex = offset + i;
        const isActive = highlighted === flatIndex;
        return (
          <li
            key={`${item.type}-${item.label}-${item.hotelId ?? ""}`}
            id={`${listboxId}-${flatIndex}`}
            role="option"
            aria-selected={isActive}
            onMouseEnter={() => onHover(flatIndex)}
            onMouseDown={(e) => {
              // mousedown rather than click — fires before onBlur closes us.
              e.preventDefault();
              onPick(item);
            }}
            className={`px-4 py-2 cursor-pointer ${
              isActive ? "bg-ink/5" : "hover:bg-ink/5"
            }`}
          >
            <div className="text-sm text-ink">{item.label}</div>
            {item.sublabel && (
              <div className="text-xs text-ink/55">{item.sublabel}</div>
            )}
          </li>
        );
      })}
    </>
  );
}
