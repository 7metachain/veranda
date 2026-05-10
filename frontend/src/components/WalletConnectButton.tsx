"use client";

import dynamic from "next/dynamic";
import { PixelButton } from "./pixel/PixelUI";

const WalletConnectButtonInner = dynamic(
  () => import("./WalletConnectButtonInner"),
  {
    ssr: false,
    loading: () => <PixelButton disabled>Loading...</PixelButton>,
  },
);

export default WalletConnectButtonInner;
