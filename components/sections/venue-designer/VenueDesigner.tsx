"use client";

import {
  useReducer,
  useState,
  useMemo,
  useEffect,
  useCallback,
  memo,
} from "react";
import type { FloorItemType, Room, UnitSystem } from "@/lib/floor";
import {
  floorReducer,
  loadFloorPlan,
  saveFloorPlan,
  clearanceViolations,
  areaPerGuest,
} from "@/lib/floor";
import { VenueToolbar } from "./VenueToolbar";
import { VenueCanvas } from "./VenueCanvas";
import { VenueInspector } from "./VenueInspector";
import { VenueClearanceList } from "./VenueClearanceList";

interface VenueDesignerProps {
  guestCount?: number;
  eventType?: string;
  className?: string;
}

function VenueDesignerComponent({
  guestCount = 80,
  eventType = "wedding",
  className = "",
}: VenueDesignerProps) {
  // Initialize state from localStorage or auto layout fallback
  const [state, dispatch] = useReducer(floorReducer, undefined, () => {
    const loaded = loadFloorPlan(guestCount, eventType);
    return {
      ...loaded,
      selectedId: null,
      unit: "m" as UnitSystem,
      snapEnabled: true,
      past: [],
      future: [],
    };
  });

  const [zoom, setZoom] = useState(1.0);
  const [announcement, setAnnouncement] = useState("");

  // Persist to localStorage upon changes
  useEffect(() => {
    saveFloorPlan({
      room: state.room,
      items: state.items,
      assignments: state.assignments,
      unseatedGuests: state.unseatedGuests,
    });
  }, [state.room, state.items, state.assignments, state.unseatedGuests]);

  // Live clearance and safety violations
  const violations = useMemo(
    () => clearanceViolations(state.items, state.room),
    [state.items, state.room]
  );

  const violationItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const v of violations) {
      for (const id of v.itemIds) ids.add(id);
    }
    return ids;
  }, [violations]);

  // Area per guest calculation
  const areaInfo = useMemo(
    () => areaPerGuest(state.room, guestCount),
    [state.room, guestCount]
  );

  // Table and seat counts
  const tablesCount = useMemo(
    () =>
      state.items.filter(
        (it) => it.type === "roundTable" || it.type === "longTable"
      ).length,
    [state.items]
  );

  const seatsCount = useMemo(
    () =>
      state.items.reduce(
        (sum, it) =>
          it.type === "roundTable" || it.type === "longTable"
            ? sum + (it.seats ?? 8)
            : sum,
        0
      ),
    [state.items]
  );

  // Selected item
  const selectedItem = useMemo(
    () => state.items.find((it) => it.id === state.selectedId) ?? null,
    [state.items, state.selectedId]
  );

  // Actions
  const handleSetRoom = useCallback((room: Partial<Room>) => {
    dispatch({ type: "setRoom", room });
  }, []);

  const handleSetUnit = useCallback((unit: UnitSystem) => {
    dispatch({ type: "setUnit", unit });
  }, []);

  const handleToggleSnap = useCallback(() => {
    dispatch({ type: "toggleSnap" });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setZoom(1.0);
  }, []);

  const handleUndo = useCallback(() => {
    dispatch({ type: "undo" });
  }, []);

  const handleRedo = useCallback(() => {
    dispatch({ type: "redo" });
  }, []);

  const handleAddItem = useCallback(
    (type: FloorItemType) => {
      const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const cx = state.room.widthM / 2;
      const cy = state.room.heightM / 2;

      let label = "Custom Fixture";
      let w = 2.0;
      let h = 2.0;
      let seats: number | undefined;

      switch (type) {
        case "roundTable":
          label = `Table ${tablesCount + 1}`;
          w = 1.8;
          h = 1.8;
          seats = 8;
          break;
        case "longTable":
          label = `Table ${tablesCount + 1}`;
          w = 2.4;
          h = 1.0;
          seats = 8;
          break;
        case "stage":
          label = "Main Stage";
          w = 6.0;
          h = 2.4;
          break;
        case "danceFloor":
          label = "Dance Floor";
          w = 4.5;
          h = 3.6;
          break;
        case "buffet":
          label = "Buffet Station";
          w = 1.8;
          h = 5.0;
          break;
        case "bar":
          label = "Beverage Bar";
          w = 1.2;
          h = 3.0;
          break;
        case "entrance":
          label = "Entrance";
          w = 3.0;
          h = 0.8;
          break;
        case "mandap":
          label = "Mandap / Canopy";
          w = 3.6;
          h = 3.6;
          break;
        case "photoBooth":
          label = "Photo Booth";
          w = 2.5;
          h = 2.0;
          break;
        case "pillar":
          label = "Pillar";
          w = 0.8;
          h = 0.8;
          break;
        case "zone":
          label = "Lounge Zone";
          w = 4.0;
          h = 3.0;
          break;
      }

      dispatch({
        type: "add",
        item: {
          id,
          type,
          label,
          x: cx - w / 2,
          y: cy - h / 2,
          w,
          h,
          rotation: 0,
          locked: false,
          seats,
        },
      });
      dispatch({ type: "select", id });
      setAnnouncement(`Added ${label} at center of room`);
    },
    [state.room, tablesCount]
  );

  const handleAutoLayout = useCallback(() => {
    dispatch({
      type: "autoLayout",
      guestCount,
      eventType,
      venueType: state.room.venueType,
    });
    setAnnouncement("Reset floor plan to smart auto layout");
  }, [guestCount, eventType, state.room.venueType]);

  const handleSelectItem = useCallback((id: string | null) => {
    dispatch({ type: "select", id });
  }, []);

  const handleMoveItem = useCallback(
    (id: string, x: number, y: number, snap?: boolean) => {
      dispatch({ type: "move", id, x, y, snap });
    },
    []
  );

  const handleResizeItem = useCallback(
    (id: string, w: number, h: number, snap?: boolean) => {
      dispatch({ type: "resize", id, w, h, snap });
    },
    []
  );

  const handleRotateItem = useCallback((id: string, rotation: number) => {
    dispatch({ type: "rotate", id, rotation });
  }, []);

  const handleDeleteItem = useCallback(
    (id: string) => {
      const target = state.items.find((it) => it.id === id);
      if (!target) return;

      // If table has seated guests, confirm deletion
      const seated = state.assignments[id];
      const hasGuests = seated && Object.values(seated).some(Boolean);
      if (hasGuests) {
        const confirmed = window.confirm(
          `This table has seated guests. Deleting it will return them to the unseated guest list. Continue?`
        );
        if (!confirmed) return;
      }

      dispatch({ type: "delete", id });
      setAnnouncement(`Deleted ${target.label}`);
    },
    [state.items, state.assignments]
  );

  const handleDuplicateItem = useCallback((id: string) => {
    dispatch({ type: "duplicate", id });
    setAnnouncement("Duplicated item");
  }, []);

  const handleInspectorUpdate = useCallback(
    (
      id: string,
      changes: {
        label?: string;
        x?: number;
        y?: number;
        w?: number;
        h?: number;
        rotation?: number;
        seats?: number;
        locked?: boolean;
      }
    ) => {
      if (changes.label !== undefined) {
        dispatch({ type: "rename", id, label: changes.label });
      }
      if (changes.x !== undefined || changes.y !== undefined) {
        const cur = state.items.find((it) => it.id === id);
        if (cur) {
          dispatch({
            type: "move",
            id,
            x: changes.x ?? cur.x,
            y: changes.y ?? cur.y,
            snap: false,
          });
        }
      }
      if (changes.w !== undefined || changes.h !== undefined) {
        const cur = state.items.find((it) => it.id === id);
        if (cur) {
          dispatch({
            type: "resize",
            id,
            w: changes.w ?? cur.w,
            h: changes.h ?? cur.h,
            snap: false,
          });
        }
      }
      if (changes.rotation !== undefined) {
        dispatch({ type: "rotate", id, rotation: changes.rotation });
      }
      if (changes.seats !== undefined) {
        dispatch({ type: "setSeats", id, seats: changes.seats });
      }
      if (changes.locked !== undefined) {
        dispatch({ type: "lock", id, locked: changes.locked });
      }
    },
    [state.items]
  );

  const handleCopySummary = useCallback(() => {
    const lines = [
      `VENUE FLOOR PLAN: ${state.room.venueType.toUpperCase()}`,
      `Dimensions: ${state.room.widthM}m x ${state.room.heightM}m (${(state.room.widthM * state.room.heightM).toFixed(0)} m²)`,
      `Capacity: ${tablesCount} tables, ${seatsCount} seats (${areaInfo.areaPerGuestM2} m² per guest)`,
      `Status: ${violations.length === 0 ? "All clearance corridors clear (0 violations)" : `${violations.length} clearance alerts`}`,
      "",
      `Fixtures (${state.items.length}):`,
      ...state.items.map(
        (it) =>
          ` - ${it.label} (${it.type}): at (${it.x.toFixed(1)}m, ${it.y.toFixed(1)}m), size ${it.w.toFixed(1)}x${it.h.toFixed(1)}m${it.seats ? `, ${it.seats} seats` : ""}`
      ),
    ];
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(lines.join("\n"));
    }
    setAnnouncement("Copied floor plan layout summary to clipboard");
  }, [state.room, state.items, tablesCount, seatsCount, areaInfo, violations]);

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white shadow-sm ${className}`}
    >
      {/* 1. Designer Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D9D9D9] bg-[#F7F7F7] px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--palette-1, #111111)" }}
              aria-hidden="true"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5A5A5A]">
              Venue &amp; floor plan layout
            </span>
          </div>
          <h4 className="mt-1 font-serif text-xl font-normal text-[#111111] sm:text-2xl">
            Event floor plan <span className="italic">designer</span>
          </h4>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#5A5A5A]">
          <span className="rounded-full border border-[#D9D9D9] bg-white px-3 py-1 font-medium text-[#111111]">
            Interactive canvas
          </span>
        </div>
      </div>

      {/* 2. Top Toolbar */}
      <VenueToolbar
        room={state.room}
        unit={state.unit}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        snapEnabled={state.snapEnabled}
        zoom={zoom}
        onSetRoom={handleSetRoom}
        onSetUnit={handleSetUnit}
        onToggleSnap={handleToggleSnap}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitToScreen={handleFitToScreen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddItem={handleAddItem}
        onAutoLayout={handleAutoLayout}
      />

      {/* 3. Main Workspace: Canvas + Inspector Sidebar */}
      <div className="grid lg:grid-cols-12 lg:items-start">
        {/* SVG Canvas Area */}
        <div className="lg:col-span-8 xl:col-span-9">
          <VenueCanvas
            room={state.room}
            items={state.items}
            selectedId={state.selectedId}
            unit={state.unit}
            snapEnabled={state.snapEnabled}
            zoom={zoom}
            violationItemIds={violationItemIds}
            onSelect={handleSelectItem}
            onMoveItem={handleMoveItem}
            onResizeItem={handleResizeItem}
            onRotateItem={handleRotateItem}
            onDeleteItem={handleDeleteItem}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onAnnounce={setAnnouncement}
          />
        </div>

        {/* Desktop Inspector Sidebar (or Mobile Bottom Panel) */}
        <div className="border-t border-[#D9D9D9] bg-[#FDFDFD] lg:col-span-4 lg:border-l lg:border-t-0 xl:col-span-3 print:hidden">
          <VenueInspector
            item={selectedItem}
            unit={state.unit}
            onUpdate={handleInspectorUpdate}
            onDuplicate={handleDuplicateItem}
            onDelete={handleDeleteItem}
            onClose={() => handleSelectItem(null)}
          />
        </div>
      </div>

      {/* 4. Live Clearance Checks & Summary */}
      <VenueClearanceList
        violations={violations}
        tablesCount={tablesCount}
        seatsCount={seatsCount}
        areaInfo={areaInfo}
        announcementText={announcement}
        onSelectItem={handleSelectItem}
        onCopySummary={handleCopySummary}
      />

      {/* 5. Print-Only Legend & Summary View */}
      <div className="hidden border-t border-[#D9D9D9] p-6 text-xs text-[#111111] print:block">
        <div className="mb-4 flex items-center justify-between border-b pb-2">
          <span className="font-serif text-lg font-bold">
            Venue Floor Plan Summary — {state.room.venueType.toUpperCase()}
          </span>
          <span>
            {state.room.widthM}m × {state.room.heightM}m | {tablesCount} tables
            | {seatsCount} seats
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-[11px]">
          <div>⚪ Round Table (8 seats)</div>
          <div>▭ Long Table (8 seats)</div>
          <div>🏛️ Main Stage / Mandap</div>
          <div>💃 Sangeet Dance Floor</div>
          <div>🍱 Buffet Station</div>
          <div>🍸 Beverage Bar</div>
          <div>🚪 Main Entrance (1.5m clearance)</div>
          <div>📸 Photo Booth</div>
        </div>
        <div className="mt-4 border-t pt-2 text-[10px] text-[#5A5A5A]">
          Printed from Celebrate Event Planner. All dimensions to scale (0.25m
          grid).
        </div>
      </div>
    </div>
  );
}

export const VenueDesigner = memo(VenueDesignerComponent);
export default VenueDesigner;
