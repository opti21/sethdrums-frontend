import { Video } from "@prisma/client";
import create from "zustand";
import { IApiRequest } from "../utils/types";

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
  request: IApiRequest | null;
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
    request: null,
    pgStatusID: "",
    video: null,
    currentStatus: "",
  },
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
  setPGData: ({ request, pgStatusID, video, currentStatus }) =>
    set(() => ({
      pgData: {
        request,
        pgStatusID,
        video,
        currentStatus,
      },
    })),
}));

// Delete Request Modal

interface IDeleteModalData {
  request: IApiRequest | null;
  video: Video | null;
}

type TDeleteModalState = {
  isOpen: boolean;
  open: (request: IApiRequest, video: Video) => void;
  close: () => void;
  deleteModalData: IDeleteModalData;
  setDeleteModalData: (newDeleteData: IDeleteModalData) => void;
};

export const useDeleteModalStore = create<TDeleteModalState>((set) => ({
  isOpen: false,
  open: (request, video) =>
    set(() => ({ isOpen: true, deleteModalData: { request, video } })),
  close: () =>
    set(() => ({
      isOpen: false,
      deleteModalData: {
        request: null,
        video: null,
      },
    })),
  deleteModalData: {
    request: null,
    video: null,
  },
  setDeleteModalData: (newDeleteData) =>
    set({ deleteModalData: newDeleteData }),
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

// Add Request Confirm Modal
type TAddRequestModalState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

export const useAddRequestModalStore = create<TAddRequestModalState>((set) => ({
  isOpen: false,
  open: () => set(() => ({ isOpen: true })),
  close: () => set(() => ({ isOpen: false })),
}));
