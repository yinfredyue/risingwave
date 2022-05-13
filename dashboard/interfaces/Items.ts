export interface Items {
  text: string;
  icon: any;
}

export interface NavItems extends Items {
  currentPage: string;
  setCurrentPage: Function;
}
