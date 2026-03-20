"use client";

import React, { createContext, useContext, useState } from "react";

export type CookHomeFooterData = {
  cartId: string | null;
  openViewCartSheet: () => void;
};

const defaultData: CookHomeFooterData = {
  cartId: null,
  openViewCartSheet: () => {},
};

type CookHomeFooterContextValue = {
  homeFooter: CookHomeFooterData;
  setHomeFooter: (data: CookHomeFooterData) => void;
};

const CookHomeFooterContext = createContext<CookHomeFooterContextValue | null>(null);

export function CookHomeFooterProvider({ children }: { children: React.ReactNode }) {
  const [homeFooter, setHomeFooter] = useState<CookHomeFooterData>(defaultData);
  return (
    <CookHomeFooterContext.Provider value={{ homeFooter, setHomeFooter }}>
      {children}
    </CookHomeFooterContext.Provider>
  );
}

export function useCookHomeFooterRef() {
  const ctx = useContext(CookHomeFooterContext);
  return ctx;
}
