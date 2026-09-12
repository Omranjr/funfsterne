"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { readStored, writeStored } from "@/lib/safe-storage";
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
import { CheckCircle2, Gift, RefreshCw, ScanLine, XCircle } from "lucide-react";

const QR_PREFIX = "funfsterne:loyalty:";
const BRANCH_STORAGE_KEY = "loyalty-scan-branch-id";

type ActiveReward = {
  id: string;
  eurosValue: string;
  createdAt: string;
};

type ScanResult =
  | { status: "idle" }
  | {
      status: "success";
      /** Kept so the card can refresh itself without another scan. */
      userId: string;
      /** False when the earn was refused but the customer was still found. */
      awarded: boolean;
      /** Why the earn was refused, if it was. */
      notice: string | null;
      customer: { firstName: string; lastName: string } | null;
      balance: number;
      activeRewards: ActiveReward[];
    }
  | { status: "error"; message: string };

export default function LoyaltyScanPage() {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult>({ status: "idle" });
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  // Set when a scan has been asked for but the <video> has not remounted yet.
  const [pendingStart, setPendingStart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  // Guards against the same QR frame firing multiple scan requests while
  // the first one is still in flight (the callback fires on every decoded
  // frame, many times a second, for as long as the code stays in view).
  const processingRef = useRef(false);

  useEffect(() => {
    // Unhandled before: a failed branch load rejected into nothing, leaving
    // `branchId` null. The scan button is disabled without one, so the page
    // simply sat there looking broken with no explanation.
    apiFetch("/admin/branches")
      .then(async (res) => {
        if (!res.ok) throw new Error("branches request failed");
        const data = (await res.json()) as Branch[];
        setBranches(data);
        const stored = readStored(BRANCH_STORAGE_KEY);
        if (stored && data.some((b) => b.id === stored)) {
          setBranchId(stored);
        } else if (data.length > 0) {
          setBranchId(data[0].id);
        }
      })
      .catch(() => {
        setCameraError(t("loyaltyScan.couldNotLoadBranches"));
      });
  }, [t]);

  const handleBranchChange = useCallback((value: string | null) => {
    if (!value) return;
    setBranchId(value);
    writeStored(BRANCH_STORAGE_KEY, value);
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
      controlsRef.current = null;
      setScanning(false);

      const userId = text.slice(QR_PREFIX.length);

      try {
        const res = await apiFetch("/admin/loyalty/scan", {
          method: "POST",
          body: JSON.stringify({ userId, branchId }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            awarded: boolean;
            errorCode: string | null;
            customer: { firstName: string; lastName: string } | null;
            balance: number;
            activeRewards: ActiveReward[];
          };
          // A refused earn is no longer a dead end. The customer, their
          // balance and any waiting voucher come back either way, so someone
          // who already earned this morning can still be served this
          // afternoon -- the refusal is just a note on the card.
          setResult({
            status: "success",
            userId,
            awarded: data.awarded,
            notice:
              data.errorCode === "ALREADY_SCANNED_TODAY"
                ? t("loyaltyScan.alreadyScannedToday")
                : null,
            customer: data.customer,
            balance: data.balance,
            activeRewards: data.activeRewards,
          });
        } else {
          const body = (await res.json().catch(() => ({}))) as { errorCode?: string };
          const message =
            body.errorCode === "USER_NOT_FOUND"
              ? t("loyaltyScan.noAccountFound")
              : t("loyaltyScan.couldNotAward");
          setResult({ status: "error", message });
        }
      } catch {
        // A dropped connection used to escape here. The camera is already
        // stopped by this point and `processingRef` stayed true, so every
        // later scan hit the guard at the top and returned silently -- the
        // scanner was bricked until the page was reloaded, with nothing on
        // screen to say why. At a till, mid-queue.
        setResult({
          status: "error",
          message: t("loyaltyScan.couldNotAward"),
        });
      } finally {
        // Must run on every path, or the guard above locks the scanner out
        // permanently.
        processingRef.current = false;
      }
    },
    [branchId, t],
  );

  const startScanning = useCallback(async () => {
    // The <video> only exists while `result.status === "idle"`, so this can
    // be reached before React has re-rendered it -- and zxing, handed nothing,
    // quietly creates its own detached video and plays the camera into that.
    // Decoding kept working while the element on screen stayed black, which is
    // a miserable thing to debug at a till. Fail loudly instead.
    const video = videoRef.current;
    if (!video) {
      setScanning(false);
      setCameraError(t("loyaltyScan.cameraErrorGeneric"));
      return;
    }

    setCameraError(null);
    setResult({ status: "idle" });
    setScanning(true);

    const reader = new BrowserQRCodeReader();
    try {
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        video,
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

  // Returning to idle unmounts the success card and remounts the <video>, but
  // that only happens on the next render -- so the camera cannot be started in
  // the same handler. This asks for a start and lets the effect below run it
  // once the element is actually back in the DOM.
  const handleScanNext = useCallback(() => {
    setResult({ status: "idle" });
    setPendingStart(true);
  }, []);

  useEffect(() => {
    if (!pendingStart) return;
    // Effects run after commit, so by the time this fires the idle card -- and
    // with it the video element -- has been rendered.
    if (result.status !== "idle" || !videoRef.current) return;
    setPendingStart(false);
    void startScanning();
  }, [pendingStart, result.status, startScanning]);

  /**
   * Re-reads the customer without touching the ledger.
   *
   * Redeeming is the customer's own action in the app, so a voucher can appear
   * seconds after the scan -- while the barber is still looking at the result.
   * Scanning again to find it would be refused as a repeat earn, so this asks
   * the read-only endpoint instead.
   */
  const handleRefresh = useCallback(async () => {
    if (result.status !== "success") return;
    setRefreshing(true);
    try {
      const res = await apiFetch(
        `/admin/loyalty/customers/${encodeURIComponent(result.userId)}`,
      );
      if (!res.ok) throw new Error("refresh failed");
      const data = (await res.json()) as {
        customer: { firstName: string; lastName: string } | null;
        balance: number;
        activeRewards: ActiveReward[];
      };
      setResult((prev) =>
        prev.status === "success"
          ? {
              ...prev,
              customer: data.customer,
              balance: data.balance,
              activeRewards: data.activeRewards,
            }
          : prev,
      );
    } catch {
      toast.error(t("loyaltyScan.couldNotRefresh"));
    } finally {
      setRefreshing(false);
    }
  }, [result, t]);

  const handleRedeemReward = useCallback(
    async (rewardId: string) => {
      setRedeemingId(rewardId);
      try {
        const res = await apiFetch(`/admin/loyalty/rewards/${rewardId}/redeem`, {
          method: "POST",
          body: JSON.stringify({ branchId }),
        });

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
      } catch {
        // A dropped connection escaped before this, so `redeemingId` was
        // never cleared: that voucher's button stayed in its pending state
        // for good, with no toast to say anything had gone wrong.
        toast.error(t("loyaltyScan.couldNotMarkUsed"), {
          description: t("loyaltyScan.pleaseTryAgain"),
        });
      } finally {
        setRedeemingId(null);
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
            <SelectValue placeholder={t("loyaltyScan.selectBranch")}>
              {(value: string | null) =>
                branches.find((b) => b.id === value)?.name ??
                t("loyaltyScan.selectBranch")
              }
            </SelectValue>
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

          {result.notice ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              {result.notice}
            </p>
          ) : null}

          {/* Redeeming happens in the customer's own app, so a voucher can
              appear seconds after the scan. Scanning again to find it would
              be refused as a repeat earn, so the card refreshes itself. */}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing
              ? t("loyaltyScan.refreshing")
              : t("loyaltyScan.checkForRewards")}
          </Button>

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
