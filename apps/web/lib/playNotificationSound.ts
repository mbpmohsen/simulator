import { Howl } from "howler";

let notificationSound: Howl | null = null;

export const playNotificationSound = (): void => {
	if (typeof window === "undefined") return;
	notificationSound ??= new Howl({
		src: ["/sounds/new-notification-021-370045.mp3"],
		volume: 0.65,
		preload: true,
	});
	notificationSound.play();
};
