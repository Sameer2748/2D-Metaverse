import { atom } from "recoil";

export const userState = atom({
  key: "userState", // unique ID (with respect to other atoms/selectors)
  default: { id: "", name: "", username: "", role: "" }, // default value (aka initial value)
});

export const avatarState = atom({
  key: "avatarState", // unique ID (with respect to other atoms/selectors)
  default: { id: "", imageUrl: "" }, // default value (aka initial value)
});
