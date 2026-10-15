"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { supabase, type Member } from "@/lib/supabase";
import MembershipCard from "./MembershipCard";
import Logo from "./Logo";
import AddToWallet from "./AddToWallet";

interface FormData {
  fullName: string;
  dob: string;
  idNumber: string;
  phone: string;
  email: string;
  address: string;
  gender: string;
  state: string;
}

type Errors = Partial<Record<keyof FormData, string>>;
type Tone = "info" | "ok" | "warn" | "error";
type View = "register" | "members" | "admin";

const MATCH_THRESHOLD = 0.55;
const PASS_STRENGTH = (1 - MATCH_THRESHOLD) * 100; // match strength needed to pass, in %

const STEPS = ["Details", "ID photo", "Face check", "Result"] as const;

const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

const EMPTY_FORM: FormData = {
  fullName: "", dob: "", idNumber: "", phone: "", email: "", address: "", gender: "", state: "",
};

declare global {
  interface Window {
    faceapi: any;
  }
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function validate(f: FormData): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = "Enter your full name as it appears on your ID.";
  if (!f.dob) e.dob = "Choose your date of birth.";
  else if (f.dob > todayISO()) e.dob = "Date of birth can't be in the future.";
  if (!f.idNumber.trim()) e.idNumber = "Enter your ID or passport number.";
  if (!f.phone.trim()) e.phone = "Enter a phone number we can reach you on.";
  else if (f.phone.replace(/\D/g, "").length < 7) e.phone = "That phone number looks too short.";
  if (!f.email.trim()) e.email = "Enter your email address.";
  else if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email, like name@example.com.";
  if (!f.address.trim()) e.address = "Enter your home address.";
  if (!f.gender) e.gender = "Choose an option.";
  return e;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function toneClasses(t: Tone) {
  switch (t) {
    case "ok":
      return "bg-brand-tint text-brand-deep";
    case "warn":
      return "bg-accent-tint text-[#8f0e16]";
    case "error":
      return "bg-stamp-tint text-stamp";
    default:
      return "bg-white text-ink-soft border border-line";
  }
}

function Field({
  label, htmlFor, required, hint, error, className = "", children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {!required && <span className="ml-1.5 font-normal text-ink-soft">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm font-medium text-stamp">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BrandMark() {
  return <Logo className="h-11 w-11" />;
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function EnrolmentWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("register");
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [idImage, setIdImage] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [idDescriptor, setIdDescriptor] = useState<Float32Array | null>(null);
  const [matchDistance, setMatchDistance] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsFailed, setModelsFailed] = useState(false);
  const [face, setFace] = useState<{ text: string; tone: Tone }>({ text: "Loading face recognition…", tone: "info" });
  const [id, setId] = useState<{ text: string; tone: Tone }>({ text: "", tone: "info" });
  const [idBusy, setIdBusy] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [membershipId, setMembershipId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState<{ text: string; tone: Tone } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevKey = useRef(`register-1`);

  const showToast = useCallback((text: string, tone: Tone = "info") => {
    setToast({ text, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------- Members + realtime ---------------- */

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    setDbError(null);
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      console.error(err);
      setDbError(err.message || "We couldn't load the member list. Check your Supabase connection.");
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();

    const channel = supabase
      .channel("members-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setMembers((prev) => {
            const exists = prev.some((m) => m.membership_id === (payload.new as Member).membership_id);
            if (exists) return prev;
            return [payload.new as Member, ...prev];
          });
        }
        if (payload.eventType === "UPDATE") {
          setMembers((prev) =>
            prev.map((m) =>
              m.membership_id === (payload.new as Member).membership_id ? (payload.new as Member) : m
            )
          );
        }
        if (payload.eventType === "DELETE") {
          setMembers((prev) => prev.filter((m) => m.membership_id !== (payload.old as Member).membership_id));
        }
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMembers]);

  /* ---------------- Face models ---------------- */

  useEffect(() => {
    if (!scriptReady || modelsLoaded) return;
    const load = async () => {
      try {
        const faceapi = window.faceapi;
        const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setFace({ text: "Ready. Start the camera when you are.", tone: "info" });
      } catch (e) {
        console.error(e);
        setModelsFailed(true);
        setFace({ text: "Face recognition failed to load. Check your connection and refresh the page.", tone: "error" });
      }
    };
    load();
  }, [scriptReady, modelsLoaded]);

  /* ---------------- Camera ---------------- */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setFace({ text: "Camera on. Centre your face in the oval, then take the photo.", tone: "info" });
    } catch {
      setFace({
        text: "Camera blocked. Allow camera access in your browser's address bar, then try again.",
        tone: "error",
      });
    }
  };

  // Re-attach the stream if the video element remounts, and release the camera when leaving the face step.
  useEffect(() => {
    if (view === "register" && step === 3 && stream && videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
    if ((view !== "register" || step !== 3) && streamRef.current) {
      stopCamera();
    }
  }, [view, step, stream, stopCamera]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  // Move focus to the new step for keyboard and screen-reader users.
  useEffect(() => {
    const key = `${view}-${step}`;
    if (prevKey.current === key) return;
    prevKey.current = key;
    panelRef.current?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [step, view]);

  /* ---------------- ID upload ---------------- */

  const processIdFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setId({ text: "That file isn't an image. Upload a JPG or PNG photo of your ID.", tone: "error" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setId({ text: "That photo is over 10 MB. Choose a smaller one.", tone: "error" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setIdImage(dataUrl);
      setIdDescriptor(null);
      setMatchDistance(null);
      if (!modelsLoaded) {
        setId({ text: "Face recognition is still loading. Wait a moment, then upload again.", tone: "warn" });
        return;
      }
      setIdBusy(true);
      setId({ text: "Looking for your face on the ID…", tone: "info" });
      try {
        const faceapi = window.faceapi;
        const img = await faceapi.bufferToImage(await (await fetch(dataUrl)).blob());
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (!detection) {
          setId({
            text: "We couldn't find a face on this ID. Retake the photo in good light with the whole card in frame.",
            tone: "error",
          });
          return;
        }
        setIdDescriptor(detection.descriptor);
        setId({ text: "Face found on your ID. You can continue.", tone: "ok" });
      } catch {
        setId({ text: "Something went wrong reading that photo. Try a different one.", tone: "error" });
      } finally {
        setIdBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processIdFile(e.target.files?.[0]);
    e.target.value = "";
  };

  /* ---------------- Capture + match ---------------- */

  const captureAndMatch = async () => {
    if (!videoRef.current || !idDescriptor || !modelsLoaded) return;
    setCapturing(true);
    setFace({ text: "Checking your face…", tone: "info" });
    try {
      const faceapi = window.faceapi;
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setFace({ text: "No face found. Face the camera in good light and try again.", tone: "warn" });
        return;
      }
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(canvas, displaySize);
        const resized = faceapi.resizeResults(detection, displaySize);
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
      }
      const dist = faceapi.euclideanDistance(idDescriptor, detection.descriptor);
      setMatchDistance(dist);

      // Snapshot face for the membership card portrait
      if (video && video.videoWidth) {
        const snap = document.createElement("canvas");
        const size = Math.min(video.videoWidth, video.videoHeight);
        snap.width = 240;
        snap.height = 280;
        const sctx = snap.getContext("2d");
        if (sctx) {
          const sx = (video.videoWidth - size) / 2;
          const sy = (video.videoHeight - size) / 2 * 0.6;
          sctx.drawImage(video, sx, sy, size, size * 1.15, 0, 0, 240, 280);
          setFacePhoto(snap.toDataURL("image/jpeg", 0.72));
        }
      }

      setFace({
        text: dist <= MATCH_THRESHOLD ? "Captured. Your face matches your ID." : "Captured, but it doesn't match your ID closely enough.",
        tone: dist <= MATCH_THRESHOLD ? "ok" : "warn",
      });
    } catch {
      setFace({ text: "The check failed. Try again.", tone: "error" });
    } finally {
      setCapturing(false);
    }
  };

  /* ---------------- Navigation ---------------- */

  const goToStep = (next: number) => {
    if (next === 2) {
      const e = validate(formData);
      setErrors(e);
      const first = Object.keys(e)[0];
      if (first) {
        document.getElementById(first)?.focus();
        return;
      }
    }
    if (next === 3 && !idDescriptor) return;
    if (next === 4) {
      if (matchDistance === null) return;
      setVerifying(true);
      setVerified(null);
      setTimeout(() => {
        const success = matchDistance <= MATCH_THRESHOLD;
        setVerified(success);
        if (success) setMembershipId("NPP-" + Math.random().toString(36).slice(2, 10).toUpperCase());
        setVerifying(false);
      }, 1400);
    }
    setStep(next);
  };

  const completeRegistration = async () => {
    if (!membershipId || matchDistance === null) return;
    setSaving(true);
    setDbError(null);

    const confidence = Math.max(0, Math.min(100, (1 - matchDistance) * 100)).toFixed(1);

    // Prevent same identification document being used twice
    const { data: existing } = await supabase
      .from("members")
      .select("membership_id")
      .eq("id_number", formData.idNumber.trim())
      .maybeSingle();

    if (existing) {
      setSaving(false);
      setDbError("This identification document has already been used to enrol. Each ID can only be registered once.");
      showToast("This ID document is already registered.", "error");
      return;
    }

    const payload = {
      user_id: userId,
      membership_id: membershipId,
      full_name: formData.fullName,
      dob: formData.dob,
      id_number: formData.idNumber.trim(),
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      gender: formData.gender,
      state: formData.state || null,
      match_score: confidence,
      distance: matchDistance,
      verified: true,
      registered_at: new Date().toISOString(),
      photo_url: facePhoto || null,
    };

    try {
      const { error } = await supabase.from("members").insert([payload]);
      if (error) {
        if (error.code === "23505") throw new Error("This identification document has already been registered.");
        throw error;
      }
      setMembers((prev) => {
        if (prev.some((m) => m.membership_id === membershipId)) return prev;
        return [payload as Member, ...prev];
      });
      setStep(5);
      stopCamera();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || "Unknown error";
      setDbError(`We couldn't save your membership: ${msg}. Your details are still here, so try again.`);
      showToast("Membership not saved. Try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData(EMPTY_FORM);
    setErrors({});
    setIdImage(null);
    setFacePhoto(null);
    setIdDescriptor(null);
    setMatchDistance(null);
    setVerified(null);
    setMembershipId("");
    setId({ text: "", tone: "info" });
    setDbError(null);
    stopCamera();
  };

  const clearAllMembers = async () => {
    try {
      const { error } = await supabase.from("members").delete().neq("membership_id", "");
      if (error) throw error;
      setMembers([]);
      showToast("All members deleted.", "ok");
    } catch (err: any) {
      showToast(`Couldn't delete members: ${err.message}`, "error");
    } finally {
      setConfirmClear(false);
    }
  };

  const exportCsv = () => {
    const cols: (keyof Member)[] = [
      "membership_id", "full_name", "dob", "id_number", "phone", "email", "address",
      "gender", "state", "match_score", "registered_at",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...members.map((m) => cols.map((c) => esc(m[c])).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `npp-members-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ---------------- Derived ---------------- */

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const fieldProps = (k: keyof FormData) => ({
    id: k,
    value: formData[k],
    onChange: set(k),
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${k}-error` : `${k}-hint`,
    className: "field-input",
  });

  const strength = matchDistance === null ? null : Math.max(0, Math.min(100, (1 - matchDistance) * 100));
  const passes = matchDistance !== null && matchDistance <= MATCH_THRESHOLD;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.full_name, m.membership_id, m.state ?? "", m.id_number].some((v) => v.toLowerCase().includes(q))
    );
  }, [members, query]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const scores = members.map((m) => parseFloat(m.match_score ?? "")).filter((n) => !Number.isNaN(n));
    const byState = new Map<string, number>();
    members.forEach((m) => {
      const s = m.state?.trim() || "Not given";
      byState.set(s, (byState.get(s) ?? 0) + 1);
    });
    return {
      total: members.length,
      verified: members.filter((m) => m.verified).length,
      today: members.filter((m) => new Date(m.registered_at).toDateString() === today).length,
      avg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      states: [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [members]);

  const issued = step === 5;
  const showCard = view === "register";

  /* ================================================================ */

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => {
          setModelsFailed(true);
          setFace({ text: "Face recognition failed to load. Check your connection and refresh the page.", tone: "error" });
        }}
      />

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* ------------------------------ Header ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <p className="font-display text-lg font-bold leading-none tracking-tight">
              New Patriotic Party
              <span className="mt-1 block text-xs font-medium text-ink-soft">Membership</span>
            </p>
          </div>
          <nav aria-label="Main" className="flex gap-1 rounded-xl bg-paper p-1">
            {(
              [
                ["register", "Join"],
                ["members", "Members"],
                ["admin", "Admin"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                aria-current={view === k ? "page" : undefined}
                className={`min-h-10 rounded-lg px-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                  view === k ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-ink-soft hover:text-ink"
                }`}
              >
                {label}
                {k === "members" && members.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-tint px-1.5 py-0.5 text-xs text-brand-deep">{members.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {dbError && view !== "register" && (
          <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-stamp/30 bg-stamp-tint p-4 text-sm text-stamp">
            <span className="flex-1 font-medium">{dbError}</span>
            <button onClick={fetchMembers} className="btn btn-secondary !min-h-9 !px-3 text-sm">Try again</button>
          </div>
        )}

        {/* =========================== JOIN =========================== */}
        {view === "register" && (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-14">
            <div className={`min-w-0 ${issued ? "order-2 lg:order-1" : ""}`}>
              {!issued && (
                <div className="mb-8">
                  <h1 className="max-w-[18ch] text-4xl font-bold leading-[1.05] sm:text-5xl">
                    Become a member of the New Patriotic Party
                  </h1>
                  <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
                    It takes about three minutes. Bring your ID and allow camera access. Your photos are checked on this device and are never uploaded.
                  </p>
                </div>
              )}

              {!issued && (
                <ol aria-label="Progress" className="mb-6 grid grid-cols-4 gap-2">
                  {STEPS.map((label, i) => {
                    const n = i + 1;
                    const done = n < step;
                    const current = n === step;
                    return (
                      <li key={label} aria-current={current ? "step" : undefined}>
                        <div className={`h-1.5 rounded-full ${done ? "bg-brand" : current ? "bg-accent" : "bg-line"}`} />
                        <p className={`mt-2 text-sm ${current ? "font-bold text-ink" : done ? "font-medium text-brand-deep" : "text-ink-soft"}`}>
                          <span className="sr-only">Step </span>
                          {n}
                          <span className="hidden sm:inline">. {label}</span>
                          <span className="sr-only sm:hidden">. {label}</span>
                          {done && <span className="sr-only"> (complete)</span>}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}

              <div ref={panelRef} tabIndex={-1} className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(14,27,61,0.04)] outline-none sm:p-8">
                {/* ------------------ Step 1: details ------------------ */}
                {step === 1 && (
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      goToStep(2);
                    }}
                  >
                    <h2 className="text-2xl font-bold">Your details</h2>
                    <p className="mt-1 mb-6 text-ink-soft">Type them exactly as they appear on your ID.</p>

                    <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
                      <Field label="Full name" htmlFor="fullName" required error={errors.fullName} className="md:col-span-2">
                        <input {...fieldProps("fullName")} autoComplete="name" placeholder="e.g. Amina Yusuf Bello" />
                      </Field>
                      <Field label="Date of birth" htmlFor="dob" required error={errors.dob}>
                        <input {...fieldProps("dob")} type="date" max={todayISO()} autoComplete="bday" />
                      </Field>
                      <Field label="Gender" htmlFor="gender" required error={errors.gender}>
                        <select {...fieldProps("gender")}>
                          <option value="">Choose one</option>
                          <option>Female</option>
                          <option>Male</option>
                          <option>Prefer not to say</option>
                        </select>
                      </Field>
                      <Field label="National ID or passport number" htmlFor="idNumber" required error={errors.idNumber} hint="Shown only as the last four digits on your card.">
                        <input {...fieldProps("idNumber")} autoComplete="off" />
                      </Field>
                      <Field label="State of origin" htmlFor="state" required={false}>
                        <input {...fieldProps("state")} list="states" autoComplete="off" placeholder="Start typing…" />
                        <datalist id="states">
                          {NG_STATES.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </Field>
                      <Field label="Phone number" htmlFor="phone" required error={errors.phone}>
                        <input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 000 0000" />
                      </Field>
                      <Field label="Email" htmlFor="email" required error={errors.email}>
                        <input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" />
                      </Field>
                      <Field label="Home address" htmlFor="address" required error={errors.address} className="md:col-span-2">
                        <textarea {...fieldProps("address")} rows={2} autoComplete="street-address" className="field-input resize-none" />
                      </Field>
                    </div>

                    <div className="mt-8 flex justify-end">
                      <button type="submit" className="btn btn-primary w-full sm:w-auto">Continue to ID photo</button>
                    </div>
                  </form>
                )}

                {/* ------------------ Step 2: ID ------------------ */}
                {step === 2 && (
                  <div>
                    <h2 className="text-2xl font-bold">Upload a photo of your ID</h2>
                    <p className="mt-1 mb-6 max-w-[56ch] text-ink-soft">
                      Use your National ID, passport or driver&rsquo;s licence. Lay it flat in good light with all four corners visible.
                    </p>

                    <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" id="id-file" onChange={handleIdUpload} />
                    <label
                      htmlFor="id-file"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        processIdFile(e.dataTransfer.files?.[0]);
                      }}
                      className={`flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors focus-within:outline focus-within:outline-[3px] focus-within:outline-accent ${
                        dragOver ? "border-brand bg-brand-tint" : idImage ? "border-line-strong bg-paper" : "border-line-strong bg-paper hover:border-brand"
                      }`}
                    >
                      {idImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={idImage} alt="Your uploaded ID" className="max-h-60 rounded-lg shadow-md" />
                          <span className="mt-4 text-sm font-semibold text-brand">Choose a different photo</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 48 48" className="h-12 w-12 text-brand" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="5" y="10" width="38" height="28" rx="4" />
                            <circle cx="17" cy="23" r="4" />
                            <path d="M10 33c1-4 4-6 7-6s6 2 7 6M29 21h10M29 27h7" strokeLinecap="round" />
                          </svg>
                          <span className="mt-3 text-base font-semibold">Choose a photo or drag it here</span>
                          <span className="mt-1 text-sm text-ink-soft">JPG or PNG, up to 10 MB</span>
                        </>
                      )}
                    </label>

                    <div aria-live="polite" className="mt-4 min-h-6">
                      {idBusy && (
                        <p className="flex items-center gap-2 text-sm text-ink-soft">
                          <Spinner className="h-4 w-4" /> {id.text}
                        </p>
                      )}
                      {!idBusy && id.text && (
                        <p className={`inline-block rounded-lg px-3 py-2 text-sm font-medium ${toneClasses(id.tone)}`}>{id.text}</p>
                      )}
                    </div>

                    <div className="mt-8 flex justify-between gap-3">
                      <button onClick={() => setStep(1)} className="btn btn-secondary">Back</button>
                      <button onClick={() => goToStep(3)} disabled={!idDescriptor || idBusy} className="btn btn-primary">
                        Continue to face check
                      </button>
                    </div>
                  </div>
                )}

                {/* ------------------ Step 3: face ------------------ */}
                {step === 3 && (
                  <div>
                    <h2 className="text-2xl font-bold">Check your face</h2>
                    <p className="mt-1 mb-6 max-w-[56ch] text-ink-soft">
                      We compare a live photo of you with the photo on your ID. Remove sunglasses or a cap and face the light.
                    </p>

                    <div className="grid items-start gap-5 md:grid-cols-[1fr_9rem]">
                      <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl bg-brand-deep">
                        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

                        {/* Oval guide */}
                        <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                          <defs>
                            <mask id="oval-mask">
                              <rect width="100" height="125" fill="white" />
                              <ellipse cx="50" cy="58" rx="28" ry="38" fill="black" />
                            </mask>
                          </defs>
                          <rect width="100" height="125" fill="rgba(7,31,92,0.55)" mask="url(#oval-mask)" />
                          <ellipse
                            cx="50" cy="58" rx="28" ry="38" fill="none"
                            stroke={strength !== null ? (passes ? "#7fe0b0" : "#ff9c92") : "#ffffff"}
                            strokeWidth="0.8" strokeDasharray={stream ? "0" : "2 2"}
                          />
                        </svg>
                        {stream && !capturing && matchDistance === null && <div className="scan-line" />}

                        {!stream && (
                          <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 p-5 text-center text-white">
                            <p className="text-sm text-white/80">The camera is off</p>
                          </div>
                        )}
                        {capturing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-brand-deep/40 text-white">
                            <Spinner className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* ID reference */}
                      <div className="hidden md:block">
                        <p className="mb-2 text-sm font-semibold">Your ID photo</p>
                        {idImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={idImage} alt="Your ID, used for comparison" className="w-full rounded-lg border border-line" />
                        )}
                      </div>
                    </div>

                    <p
                      aria-live="polite"
                      className={`mx-auto mt-4 max-w-md rounded-lg px-3 py-2 text-center text-sm font-medium ${toneClasses(face.tone)}`}
                    >
                      {face.text}
                    </p>

                    {strength !== null && (
                      <div className="mx-auto mt-5 max-w-md pop-in">
                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                          <span className="font-semibold">Match strength</span>
                          <span className={`font-bold ${passes ? "text-brand" : "text-stamp"}`}>{strength.toFixed(0)}%</span>
                        </div>
                        <div className="relative h-3 rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(strength)} aria-label="Match strength">
                          <div className={`h-full rounded-full ${passes ? "bg-brand" : "bg-stamp"}`} style={{ width: `${strength}%` }} />
                          <div className="absolute -top-1 h-5 w-0.5 bg-ink" style={{ left: `${PASS_STRENGTH}%` }} />
                        </div>
                        <p className="mt-1.5 text-xs text-ink-soft">The line marks the minimum needed to pass ({PASS_STRENGTH.toFixed(0)}%).</p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {!stream ? (
                        <button onClick={startCamera} disabled={!modelsLoaded || modelsFailed} className="btn btn-primary">
                          {!modelsLoaded && !modelsFailed ? (<><Spinner className="h-4 w-4" /> Loading…</>) : "Turn on camera"}
                        </button>
                      ) : (
                        <>
                          <button onClick={captureAndMatch} disabled={capturing} className="btn btn-primary">
                            {matchDistance === null ? "Take photo and check" : "Retake and check"}
                          </button>
                          <button onClick={stopCamera} className="btn btn-secondary">Turn off camera</button>
                        </>
                      )}
                    </div>

                    <div className="mt-8 flex justify-between gap-3 border-t border-line pt-6">
                      <button onClick={() => setStep(2)} className="btn btn-secondary">Back</button>
                      <button onClick={() => goToStep(4)} disabled={matchDistance === null} className="btn btn-primary">See result</button>
                    </div>
                  </div>
                )}

                {/* ------------------ Step 4: result ------------------ */}
                {step === 4 && (
                  <div aria-live="polite">
                    {verifying && (
                      <div className="flex flex-col items-center py-14 text-center">
                        <Spinner className="h-10 w-10 text-brand" />
                        <h2 className="mt-5 text-xl font-bold">Verifying your identity</h2>
                        <p className="mt-1 text-ink-soft">This takes a moment.</p>
                      </div>
                    )}

                    {!verifying && verified && (
                      <div>
                        <h2 className="text-2xl font-bold">You&rsquo;re verified</h2>
                        <p className="mt-1 mb-6 max-w-[56ch] text-ink-soft">
                          Your face matches your ID with {strength?.toFixed(0)}% strength. Complete your enrolment to save your membership.
                        </p>
                        <div className="rounded-xl bg-brand-tint p-4">
                          <p className="text-sm text-brand-deep">Your membership number</p>
                          <p className="mt-0.5 font-mono text-2xl font-semibold tracking-wider text-brand-deep">{membershipId}</p>
                        </div>
                        {dbError && (
                          <p role="alert" className="mt-4 rounded-lg bg-stamp-tint p-3 text-sm font-medium text-stamp">{dbError}</p>
                        )}
                        <div className="mt-8 flex justify-end">
                          <button onClick={completeRegistration} disabled={saving} className="btn btn-primary w-full sm:w-auto">
                            {saving ? (<><Spinner className="h-4 w-4" /> Saving…</>) : "Complete enrolment"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!verifying && verified === false && (
                      <div>
                        <h2 className="text-2xl font-bold text-stamp">We couldn&rsquo;t match your face</h2>
                        <p className="mt-1 mb-5 max-w-[56ch] text-ink-soft">
                          Match strength was {strength?.toFixed(0)}%, and {PASS_STRENGTH.toFixed(0)}% is needed. This is usually down to lighting or the ID photo.
                        </p>
                        <ul className="mb-8 list-disc space-y-1.5 pl-5 text-ink-soft">
                          <li>Face a window or lamp, not a bright light behind you.</li>
                          <li>Take off glasses, a cap or a face covering.</li>
                          <li>Upload a sharper photo of your ID with no glare on the portrait.</li>
                        </ul>
                        <div className="flex flex-wrap justify-end gap-3">
                          <button onClick={() => setStep(2)} className="btn btn-secondary">Upload ID again</button>
                          <button onClick={() => setStep(3)} className="btn btn-primary">Try the camera again</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ------------------ Step 5: done ------------------ */}
                {step === 5 && (
                  <div>
                    <h2 className="text-3xl font-bold">Welcome, {formData.fullName.split(" ")[0] || "member"}</h2>
                    <p className="mt-2 max-w-[52ch] text-lg text-ink-soft">
                      Your membership is active. Keep your number safe: you&rsquo;ll need it to prove you&rsquo;re a member.
                    </p>
                    <p className="mt-6 font-mono text-2xl font-semibold tracking-wider text-brand">{membershipId}</p>
                    <AddToWallet className="mt-6 max-w-sm [&>div]:justify-start" />
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button onClick={() => { resetForm(); router.push("/dashboard"); }} className="btn btn-primary">See all members</button>
                      <button onClick={resetForm} className="btn btn-secondary">Enrol someone else</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live membership card */}
            {showCard && (
              <aside
                className={`min-w-0 lg:sticky lg:top-24 ${issued ? "order-1 lg:order-2" : ""}`}
                aria-label="Membership card preview"
              >
                <MembershipCard
                  name={formData.fullName.trim()}
                  dob={formData.dob}
                  state={formData.state.trim()}
                  idNumber={formData.idNumber}
                  photo={facePhoto || idImage}
                  membershipId={issued || (step === 4 && verified) ? membershipId : ""}
                  issued={issued}
                />
                {!issued && (
                  <p className="mt-4 max-w-[42ch] text-sm text-ink-soft">
                    This is your card. It fills in as you go and is issued once your face is verified.
                  </p>
                )}
              </aside>
            )}
          </div>
        )}

        {/* =========================== MEMBERS =========================== */}
        {view === "members" && (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold sm:text-4xl">Members</h1>
                <p className="mt-1 flex items-center gap-2 text-ink-soft">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${live ? "live-dot bg-brand" : "bg-line-strong"}`}
                    aria-hidden="true"
                  />
                  {live ? "Live: new members appear here as they enrol." : "Reconnecting to live updates…"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchMembers} disabled={loadingMembers} className="btn btn-secondary !min-h-10">
                  {loadingMembers ? (<><Spinner className="h-4 w-4" /> Refreshing</>) : "Refresh"}
                </button>
                <button onClick={exportCsv} disabled={members.length === 0} className="btn btn-secondary !min-h-10">Export CSV</button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="search" className="sr-only">Search members</label>
              <input
                id="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, membership number, state or ID"
                className="field-input sm:max-w-md"
              />
            </div>

            {members.length === 0 && !loadingMembers ? (
              <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
                <h2 className="text-xl font-bold">No members yet</h2>
                <p className="mx-auto mt-1 max-w-[40ch] text-ink-soft">The first person to finish enrolment will show up here straight away.</p>
                <button onClick={() => setView("register")} className="btn btn-primary mt-6">Enrol a member</button>
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface px-6 py-12 text-center text-ink-soft">
                No members match &ldquo;{query}&rdquo;. Check the spelling or clear the search.
              </p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                <div className="hidden grid-cols-[2.5fr_1.4fr_1fr_1fr_0.9fr] gap-4 border-b border-line bg-paper px-5 py-3 text-sm font-semibold text-ink-soft md:grid">
                  <span>Member</span>
                  <span>Membership number</span>
                  <span>State</span>
                  <span>Joined</span>
                  <span className="text-right">Match</span>
                </div>
                <ul className="divide-y divide-line">
                  {filtered.map((m) => (
                    <li key={m.membership_id} className="grid items-center gap-x-4 gap-y-1 px-5 py-4 md:grid-cols-[2.5fr_1.4fr_1fr_1fr_0.9fr]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-sm font-bold text-white" aria-hidden="true">
                          {initials(m.full_name)}
                        </span>
                        <span className="truncate font-semibold">{m.full_name}</span>
                      </div>
                      <span className="font-mono text-sm md:text-base">{m.membership_id}</span>
                      <span className="text-sm text-ink-soft md:text-base">{m.state || "—"}</span>
                      <span className="text-sm text-ink-soft md:text-base">{timeAgo(m.registered_at)}</span>
                      <span className="md:text-right">
                        <span className="inline-block rounded-full bg-brand-tint px-2.5 py-1 text-sm font-semibold text-brand-deep">
                          {m.match_score}%
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* =========================== ADMIN =========================== */}
        {view === "admin" && (
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <h1 className="text-3xl font-bold sm:text-4xl">Admin</h1>
              <div className="flex items-center gap-2">
                <button onClick={fetchMembers} disabled={loadingMembers} className="btn btn-secondary !min-h-10">Refresh</button>
                <button onClick={exportCsv} disabled={members.length === 0} className="btn btn-primary !min-h-10">Export CSV</button>
              </div>
            </div>

            <p className="mb-6 rounded-xl bg-accent-tint px-4 py-3 text-sm text-[#8f0e16]">
              This page isn&rsquo;t password-protected in the demo. Add sign-in before sharing the site publicly.
            </p>

            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ["Total members", String(stats.total)],
                ["Enrolled today", String(stats.today)],
                ["Verified", String(stats.verified)],
                ["Average match", stats.avg === null ? "—" : `${stats.avg.toFixed(0)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-surface p-5">
                  <dt className="text-sm text-ink-soft">{label}</dt>
                  <dd className="mt-1 font-display text-4xl font-bold tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <h2 className="text-lg font-bold">Members by state</h2>
                {stats.states.length === 0 ? (
                  <p className="mt-3 text-ink-soft">Nothing to show until someone enrols.</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {stats.states.map(([s, n]) => (
                      <li key={s}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium">{s}</span>
                          <span className="text-ink-soft">{n}</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-paper">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${(n / stats.states[0][1]) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <h2 className="text-lg font-bold">Latest enrolments</h2>
                {members.length === 0 ? (
                  <p className="mt-3 text-ink-soft">Nothing to show until someone enrols.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {members.slice(0, 5).map((m) => (
                      <li key={m.membership_id} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="truncate font-medium">{m.full_name}</span>
                        <span className="shrink-0 text-sm text-ink-soft">{timeAgo(m.registered_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stamp/30 bg-stamp-tint p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-stamp">Delete all members</h2>
                <p className="mt-0.5 max-w-[52ch] text-sm text-ink-soft">Permanently removes every member record. Export a CSV first if you need a copy.</p>
              </div>
              <button onClick={() => setConfirmClear(true)} disabled={members.length === 0} className="btn btn-danger">Delete all members</button>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft sm:px-6">
          Face matching runs in your browser. ID and selfie photos are never sent to our servers; only your details and match score are saved.
        </div>
      </footer>

      {/* Confirm dialog */}
      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
          onKeyDown={(e) => e.key === "Escape" && setConfirmClear(false)}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-desc" className="pop-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="confirm-title" className="text-xl font-bold">Delete all {members.length} members?</h2>
            <p id="confirm-desc" className="mt-2 text-ink-soft">This permanently removes every record and can&rsquo;t be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button autoFocus onClick={() => setConfirmClear(false)} className="btn btn-secondary">Keep members</button>
              <button onClick={clearAllMembers} className="btn btn-danger">Delete all members</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div role="status" className={`pop-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-semibold shadow-lg ${
          toast.tone === "error" ? "bg-stamp text-white" : toast.tone === "ok" ? "bg-brand-deep text-white" : "bg-ink text-white"
        }`}>
          {toast.text}
        </div>
      )}
    </>
  );
}
