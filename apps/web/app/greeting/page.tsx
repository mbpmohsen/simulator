import { Suspense } from "react";
import Todos from "@/components/Todos.tsx";

export default async function Home() {
    return (
        <div>
            <div>This rendered on server</div>
            <Suspense fallback="Loading....">
                <Todos />
            </Suspense>
        </div>
    );
}
