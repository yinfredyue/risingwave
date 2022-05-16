import { ReactNode } from "react";

export interface Items {
  text: string;
  icon: ReactNode;
}

export interface NavItems extends Items {
  currentPage: string;
  setCurrentPage: Function;
}
