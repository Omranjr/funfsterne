"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { type Branch, POINTS_PER_VISIT } from "@funfsterne/shared-types";
import { CheckCircle2, Gift, ScanLine, XCircle } from "lucide-react";

const QR_PREFIX = "funfsterne:loyalty:";
const BRANCH_STORAGE_KEY = "loyalty-scan-branch-id";

type ActiveReward = {
  id: string;
  eurosValue: string;
  createdAt: string;
};

type ScanResult =
  | { status: "idle" }
  | { status: "success"; customer: { firstName: string; lastName: string } | null; balance: number; activeRewards: ActiveReward[] }
  | { status: "error"; message: string };

export default function LoyaltyScanPage() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult>({ status: "idle" });
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Guards against the same QR frame firing multiple scan requests while
  // the first one is still in flight (the callback fires on every decoded
  // frame, many times a second, for as long as the code stays in view).
  const processingRef = useRef(false);

  useEffect(() => {
    apiFetch("/admin/branches").then(async (res) => {
      if (res.ok) {
        const data = (await res.json()) as Branch[];
        setBranches(data);
        const stored = localStorage.getItem(BRANCH_STORAGE_KEY);
        if (stored && data.some((b) => b.id === stored)) {
          setBranchId(stored);
        } else if (data.length > 0) {
          setBranchId(data[0].id);
        }
      }
    });
  }, []);

  const handleBranchChange = useCallback((value: string | null) => {
    if (!value) return;
    setBranchId(value);
    localStorage.setItem(BRANCH_STORAGE_KEY, value);
  }, []);

  const handleDecoded = useCallback(
    async (text: string) => {
      if (processingRef.current) return;
      if (!text.startsWith(QR_PREFIX)) {
        setResult({ status: "error", message: t("loyaltyScan.notFsCode") });
        return;
      }

      processingRef.current = true;
      controlsRef.current?.stop();
      setScanning(false);

      const userId = text.slice(QR_PREFIX.length);

      const res = await apiFetch("/admin/loyalty/scan", {
        method: "POST",
        body: JSON.stringify({ userId, branchId }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          customer: { firstName: string; lastName: string } | null;
          balance: number;
          activeRewards: ActiveReward[];
        };
        setResult({
          status: "success",
          customer: data.customer,
          balance: data.balance,
          activeRewards: data.activeRewards,
        });
      } else {
        const body = (await res.json().catch(() => ({}))) as { errorCode?: string };
        const message =
          body.errorCode === "ALREADY_SCANNED_TODAY"
            ? t("loyaltyScan.alreadyScannedToday")
            : body.errorCode === "USER_NOT_FOUND"
              ? t("loyaltyScan.noAccountFound")
              : t("loyaltyScan.couldNotAward");
        setResult({ status: "error", message });
      }

      processingRef.current = false;
    },
    [branchId, t],
  );

  const startScanning = useCallback(async () => {
    setCameraError(null);
    setResult({ status: "idle" });
    setScanning(true);

    const reader = new BrowserQRCodeReader();
    try {
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (decoded) => {
          if (decoded) {
            handleDecoded(decoded.getText());
          }
        },
      );
      controlsRef.current = controls;
    } catch (err) {
      setScanning(false);
      setCameraError(
        err instanceof Error
          ? `${t("loyaltyScan.cameraError")}: ${err.message}`
          : t("loyaltyScan.cameraErrorGeneric"),
      );
    }
  }, [handleDecoded, t]);

  const stopScanning = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  const handleScanNext = useCallback(() => {
    setResult({ status: "idle" });
    startScanning();
  }, [startScanning]);

  const handleRedeemReward = useCallback(
    async (rewardId: string) => {
      setRedeemingId(rewardId);
      const res = await apiFetch(`/admin/loyalty/rewards/${rewardId}/redeem`, {
        method: "POST",
        body: JSON.stringify({ branchId }),
      });
      setRedeemingId(null);

      if (res.ok) {
        toast.success(t("loyaltyScan.rewardMarkedUsed"));
        if (result.status === "success") {
          setResult({
            ...result,
            activeRewards: result.activeRewards.filter((r) => r.id !== rewardId),
          });
        }
      } else {
        toast.error(t("loyaltyScan.couldNotMarkUsed"), {
          description: t("loyaltyScan.pleaseTryAgain"),
        });
      }
    },
    [branchId, result, t],
  );

  return (
    <div className="mx-auto max-w-md space-y-6">
      <PageHeader
        title={t("loyaltyScan.title")}
        description={t("loyaltyScan.description", { points: POINTS_PER_VISIT })}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium">{t("loyaltyScan.branch")}</label>
        <Select value={branchId} onValueChange={handleBranchChange}>
          <SelectTrigger>
            <SelectValue placeholder={t("loyaltyScan.selectBranch")} />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {result.status === "idle" && (
        <Card className="items-center justify-center gap-4 p-6">
          <video
            ref={videoRef}
            className={`aspect-square w-full rounded-lg bg-black object-cover transition-shadow ${
              scanning ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            }`}
            muted
            playsInline
          />
          {cameraError ? (
            <p className="text-center text-sm text-destructive">{cameraError}</p>
          ) : null}
          {scanning ? (
            <Button variant="outline" onClick={stopScanning} className="w-full">
              {t("loyaltyScan.cancel")}
            </Button>
          ) : (
            <Button onClick={startScanning} disabled={!branchId} className="w-full">
              <ScanLine className="mr-2 h-4 w-4" />
              {t("loyaltyScan.startScanning")}
            </Button>
          )}
        </Card>
      )}

      {result.status === "success" && (
        <Card className="items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-lg font-semibold">
              {result.customer
                ? `${result.customer.firstName} ${result.customer.lastName}`
                : t("loyaltyScan.customer")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("loyaltyScan.newBalance", { balance: result.balance })}
            </p>
          </div>

          {result.activeRewards.length > 0 ? (
            <div className="w-full space-y-2 text-left">
              <p className="text-sm font-medium">{t("loyaltyScan.activeRewards")}</p>
              {result.activeRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Gift className="h-4 w-4 text-muted-foreground" />
                    {t("loyaltyScan.voucher", { value: reward.eurosValue })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={redeemingId === reward.id}
                    onClick={() => handleRedeemReward(reward.id)}
                  >
                    {redeemingId === reward.id
                      ? t("loyaltyScan.markingUsed")
                      : t("loyaltyScan.markUsed")}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          <Button onClick={handleScanNext} className="w-full">
            {t("loyaltyScan.scanNextCustomer")}
          </Button>
        </Card>
      )}

      {result.status === "error" && (
        <Card className="items-center gap-4 p-6 text-center">
          <XCircle className="h-12 w-12 text-destructive" />
          <p className="text-sm">{result.message}</p>
          <Button onClick={handleScanNext} className="w-full">
            {t("loyaltyScan.tryAgain")}
          </Button>
        </Card>
      )}
    </div>
  );
}
