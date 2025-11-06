import Image from "next/image";
import AdminLoginBackground from "@/assets/admin-login-bg.svg";
import LoginCard from "@/components/LoginCard";

export default function LoginPage() {
    return (
        <div className="fixed inset-0 -z-10">
            <Image
                alt="admin login background"
                src={AdminLoginBackground.src}
                fill
                className="object-cover"
                sizes="100svw"
            />
            <LoginCard />
        </div>
    );
}