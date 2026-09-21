import type { ReactNode } from "react";
import AdminAuthGate from "@/components/AdminAuthGate";
import AdminNav from "@/components/AdminNav";

/** Sign-in once, one navigation bar, for every admin route. */
export default function AdminShell({ children }: { children: ReactNode }) {
	return (
		<AdminAuthGate>
			<AdminNav />
			{children}
		</AdminAuthGate>
	);
}
