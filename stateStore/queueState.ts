import create from "zustand";
import { IQueue } from "../utils/types";

type TModQueueState = {
  queue: IQueue | null;
  setQueue: (newQueue: IQueue) => void;
  queueError: string | null;
  setQueueError: (newQueueError: string | null) => void;
  queueStatus: string;
  setQueueStatus: (newQueueStatus: string) => void;
  beingUpdatedBy: string;
  setBeingUpdatedBy: (newBeingUpdatedBy: string) => void;
  activeId: string | null;
  setActiveId: (newActiveId: string | null) => void;
};

export const useModQueueStore = create<TModQueueState>((set) => ({
  queue: null,
  queueError: null,
  queueStatus: "loading",
  beingUpdatedBy: "",
  setQueue: (newQueue) => set({ queue: newQueue }),
  setQueueError: (newQueueError) => set({ queueError: newQueueError }),
  setQueueStatus: (newQueueStatus) => set({ queueStatus: newQueueStatus }),
  setBeingUpdatedBy: (newBeingUpdatedBy) =>
    set({ beingUpdatedBy: newBeingUpdatedBy }),
  activeId: null,
  setActiveId: (newActiveId) => set({ activeId: newActiveId }),
}));

type TPublicQueueState = {
  queue: IQueue;
  setQueue: (newQueue: IQueue) => void;
  queueError: string;
  queueStatus: string;
};

export const usePublicQueueStore = create<TPublicQueueState>((set) => ({
  queue: null,
  queueError: null,
  queueStatus: null,
  setQueue: (newQueue) => set({ queue: newQueue }),
}));
