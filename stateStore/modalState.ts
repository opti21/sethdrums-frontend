import { Video } from "@prisma/client";
import create from "zustand";

// PG Confirm Modal
type TPGConfirmModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const usePGConfirmModalStore = create<TPGConfirmModalState>((set) => ({
  isOpen: false,
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
}));

// PG Checker Modal
interface PGData {
  requestID: string;
  pgStatusID: string;
  video: Video | null;
  currentStatus: string;
}

type TPGCheckerModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  pgData: PGData;
  setPGData: (PGData: PGData) => void;
};

export const usePGCheckerModalStore = create<TPGCheckerModalState>((set) => ({
  isOpen: false,
  pgData: {
    requestID: "",
    pgStatusID: "",
    video: null,
    currentStatus: "",
  },
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
  setPGData: ({ requestID, pgStatusID, video, currentStatus }) =>
    set(() => ({
      pgData: {
        requestID,
        pgStatusID,
        video,
        currentStatus,
      },
    })),
}));

// Fart Modal
type TFartModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useFartModalStore = create<TFartModalState>((set) => ({
  isOpen: false,
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
}));
