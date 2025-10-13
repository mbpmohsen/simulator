import { Button } from "@workspace/ui/components/button"
import {ModeToggle} from "@/components/ModeToggle";
import {KbdDemo} from "@/components/KbdDemo";
import PlayerCard from "@/components/PlayerCard";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh relative">
      <div className="flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">You can easily Change the theme</h1>
        <ModeToggle />
        <KbdDemo />
        <PlayerCard />
      </div>
    </div>
  )
}
