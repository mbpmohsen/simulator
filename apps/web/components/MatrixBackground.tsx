"use client";

import React, { useEffect, useMemo, useRef } from "react";

type Speed =
    | number
    | {
    min: number; // px per frame
    max: number; // px per frame
};

export type MatrixBackgroundProps = {
    /** strings that will rain down (each rendered as its characters) */
    texts?: string[];
    /** character (font) size in px */
    fontSize?: number;
    /** speed in px/frame or a range */
    speed?: Speed;
    /** gap between columns (defaults to fontSize); use < 1 for denser, > 1 for sparser */
    columnStepFactor?: number;
    /** global background fade per frame (0..1), higher = longer trails */
    trailAlpha?: number;
    /** base hue (0..360) for the matrix color; 120 = green */
    hue?: number;
    /** tail/head lightness (0..100) */
    lightBody?: number;
    lightTail?: number;
    lightHead?: number;
    /** % chance (0..1) to flicker a random digit instead of the actual char */
    flickerChance?: number;
    /** % chance (0..1) that a char is part of a “lit” tail */
    tailGlowChance?: number;
    /** direction of the rain */
    direction?: "down" | "up";
    /** font family */
    fontFamily?: string;
    /** overall opacity of the canvas (0..1) */
    opacity?: number;
    /** z-index of the fixed canvas (default: -1) */
    zIndex?: number;
    /** optional className if you want to target it */
    className?: string;
};

const DEFAULT_LANGS = [
    "Hello World",
    "مرحبا بالعالم",
    "Salam Dünya",
    "Прывітанне Сусвет",
    "Здравей свят",
    "ওহে বিশ্ব",
    "Zdravo svijete",
    "Hola món",
    "Kumusta Kalibutan",
    "Ahoj světe",
    "Helo Byd",
    "Hej Verden",
    "Hallo Welt",
    "Γειά σου Κόσμε",
    "Hello World",
    "Hello World",
    "Hola Mundo",
    "Tere, Maailm",
    "Kaixo Mundua",
    "سلام دنیا",
    "Hei maailma",
    "Bonjour le monde",
    "Dia duit an Domhan",
    "Ola mundo",
    "હેલો વર્લ્ડ",
    "Sannu Duniya",
    "नमस्ते दुनिया",
    "Hello World",
    "Pozdrav svijete",
    "Bonjou Mondyal la",
    "Helló Világ",
    "Բարեւ աշխարհ",
    "Halo Dunia",
    "Ndewo Ụwa",
    "Halló heimur",
    "Ciao mondo",
    "שלום עולם",
    "こんにちは世界",
    "Hello World",
    "Გამარჯობა მსოფლიო",
    "Сәлем Әлем",
    "សួស្តី​ពិភពលោក",
    "ಹಲೋ ವರ್ಲ್ಡ್",
    "안녕하세요 월드",
    "Ciao mondo",
    "ສະ​ບາຍ​ດີ​ຊາວ​ໂລກ",
    "Labas pasauli",
    "Sveika pasaule",
    "Hello World",
    "Kia Ora",
    "Здраво свету",
    "ഹലോ വേൾഡ്",
    "Сайн уу",
    "हॅलो वर्ल्ड",
    "Hai dunia",
    "Hello dinja",
    "မင်္ဂလာပါကမ္ဘာလောက",
    "नमस्कार संसार",
    "Hallo Wereld",
    "Hei Verden",
    "Moni Dziko Lapansi",
    "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਦੁਨਿਆ",
    "Witaj świecie",
    "Olá Mundo",
    "Salut Lume",
    "Привет, мир",
    "හෙලෝ වර්ල්ඩ්",
    "Ahoj svet",
    "Pozdravljen, svet",
    "Waad salaaman tihiin",
    "Përshendetje Botë",
    "Здраво Свете",
    "Lefatše Lumela",
    "Halo Dunya",
    "Hej världen",
    "Salamu, Dunia",
    "ஹலோ வேர்ல்ட்",
    "హలో వరల్డ్",
    "Салом Ҷаҳон",
    "สวัสดีชาวโลก",
    "Kamusta Mundo",
    "Selam Dünya",
    "Привіт Світ",
    "ہیلو ورلڈ",
    "Salom Dunyo",
    "Chào thế giới",
    "העלא וועלט",
    "Mo ki O Ile Aiye",
    "你好，世界",
    "你好，世界",
    "你好，世界",
    "Sawubona Mhlaba",
];

type Stream = {
    x: number;
    chars: string[];
    headY: number; // top-most (for down) or bottom-most (for up) position of the stream
    speed: number; // px per frame
};

export default function MatrixBackground({
                                             texts = DEFAULT_LANGS,
                                             fontSize = 18,
                                             speed = { min: 1, max: 6 },
                                             columnStepFactor = 1,
                                             trailAlpha = 0.08,
                                             hue = 120,
                                             lightBody = 55,
                                             lightTail = 70,
                                             lightHead = 85,
                                             flickerChance = 0.1,
                                             tailGlowChance = 0.3,
                                             direction = "down",
                                             fontFamily = "monospace",
                                             opacity = 1,
                                             zIndex = -1,
                                             className,
                                         }: MatrixBackgroundProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamsRef = useRef<Stream[]>([]);
    const rafRef = useRef<number | null>(null);
    const dprRef = useRef<number>(1);

    const textPool = useMemo(() => {
        // turn each string into an array of characters; preserve multi-byte chars via Array.from
        return texts.map((t) => Array.from(t));
    }, [texts]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d", { alpha: true })!;
        const setSize = () => {
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            dprRef.current = dpr;
            const { innerWidth: w, innerHeight: h } = window;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.font = `${fontSize}px ${fontFamily}`;
            ctx.textBaseline = "top";
        };

        const randBetween = (min: number, max: number) =>
            Math.random() * (max - min) + min;

        const pickSpeed = (): number => {
            if (typeof speed === "number") return speed;
            const { min, max } = speed;
            return randBetween(min, max);
        };

        const buildStreams = () => {
            const { innerWidth: w, innerHeight: h } = window;
            streamsRef.current = [];
            const columnStep = Math.max(4, fontSize * columnStepFactor);
            for (let x = 0; x < w; x += columnStep) {
                const chars = textPool[Math.floor(Math.random() * textPool.length)];
                const headSeed =
                    direction === "down"
                        ? -randBetween(0, h) // start above
                        : h + randBetween(0, h); // start below
                streamsRef.current.push({
                    x,
                    chars: chars as string[],
                    headY: headSeed,
                    speed: pickSpeed(),
                });
            }
        };

        const drawFrame = () => {
            const { innerWidth: w, innerHeight: h } = window;

            // trail: draw translucent rect over the whole canvas
            ctx.fillStyle = `rgba(0,0,0,${trailAlpha})`;
            ctx.fillRect(0, 0, w, h);

            for (const s of streamsRef.current) {
                // advance head
                s.headY += direction === "down" ? s.speed : -s.speed;

                // wrap around when fully off-screen
                const maxLen = s.chars.length * fontSize;
                if (direction === "down" && s.headY - maxLen > h) {
                    s.headY = -Math.random() * h;
                    s.speed = pickSpeed();
                } else if (direction === "up" && s.headY + maxLen < 0) {
                    s.headY = h + Math.random() * h;
                    s.speed = pickSpeed();
                }

                for (let i = 0; i < s.chars.length; i++) {
                    const y =
                        direction === "down"
                            ? s.headY - i * fontSize
                            : s.headY + i * fontSize;

                    if (y < -fontSize || y > h) continue;

                    let light = lightBody;
                    if (Math.random() < tailGlowChance && i < 4) light = lightTail;
                    if (i === 0) light = lightHead;

                    const showDigit = Math.random() < flickerChance;
                    const glyph = showDigit
                        ? String(Math.floor(Math.random() * 10))
                        : s.chars[(s.chars.length - i) % s.chars.length];

                    ctx.fillStyle = `hsl(${hue} 100% ${light}%)`;
                    ctx.fillText(glyph!, s.x, y);
                }
            }

            rafRef.current = requestAnimationFrame(drawFrame);
        };

        const handleResize = () => {
            setSize();
            buildStreams();
        };

        setSize();
        buildStreams();
        // initial backdrop fill
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        rafRef.current = requestAnimationFrame(drawFrame);
        window.addEventListener("resize", handleResize);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", handleResize);
        };
    }, [
        columnStepFactor,
        direction,
        flickerChance,
        fontFamily,
        fontSize,
        hue,
        lightBody,
        lightHead,
        lightTail,
        speed,
        tailGlowChance,
        textPool,
        trailAlpha,
    ]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex,
                opacity,
            }}
            aria-hidden
        />
    );
}
