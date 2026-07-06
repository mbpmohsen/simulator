import { Howl } from "howler";

let notificationSound: Howl | null = null;
let gameFinishedSound: Howl | null = null;

export const playNotificationSound = (): void => {
	if (typeof window === "undefined") return;
	notificationSound ??= new Howl({
		src: ["/sounds/new-notification-021-370045.mp3"],
		volume: 0.65,
		preload: true,
	});
	notificationSound.play();
};

export const playGameFinishedSound = (): void => {
	if (typeof window === "undefined") return;
	gameFinishedSound ??= new Howl({
		src: ["/sounds/eaglaxle-gaming-victory-2-464017.mp3"],
		volume: 0.3,
		preload: true,
	});
	gameFinishedSound.play();
};
