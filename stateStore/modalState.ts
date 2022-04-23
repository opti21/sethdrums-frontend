import create from "zustand";

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

type PGData = {
  requestID: string;
  pgStatusID: string;
  youtubeID: string;
  currentStatus: string;
};

type TPGCheckerModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  pgData: PGData;
  setPGData: (PGData) => void;
};

export const usePGCheckerModalStore = create<TPGCheckerModalState>((set) => ({
  isOpen: false,
  pgData: {
    requestID: "",
    pgStatusID: "",
    youtubeID: "",
    currentStatus: "",
  },
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
  setPGData: ({ requestID, pgStatusID, youtubeID, currentStatus }) =>
    set(() => ({
      pgData: {
        requestID,
        pgStatusID,
        youtubeID,
        currentStatus,
      },
    })),
}));
