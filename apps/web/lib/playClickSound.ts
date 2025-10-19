import { Howl } from "howler";

const clickSound = new Howl({
	src: ["/sounds/computer-mouse-click-351398.mp3"],
	volume: 0.5,
});

export function playClickSound() {
	clickSound.play();
}
