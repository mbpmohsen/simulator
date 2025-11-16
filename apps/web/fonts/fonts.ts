import localFont from "next/font/local";

const vazir = localFont({
    src: [
        {
            path: "./vazir/Vazir-Thin.woff2",
            weight: "100",
            style: "normal",
        },
        {
            path: "./vazir/Vazir-Light.woff2",
            weight: "300",
            style: "normal",
        },
        {
            path: "./vazir/Vazir.woff2",
            weight: "400",
            style: "normal",
        },
        {
            path: "./vazir/Vazir-Medium.woff2",
            weight: "500",
            style: "normal",
        },
        {
            path: "./vazir/Vazir-Bold.woff2",
            weight: "700",
            style: "normal",
        },
    ],
    variable: "--font-vazir-local",
});

export { vazir };