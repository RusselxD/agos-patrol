import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import Container from "../components/Container";
import InputOTPField from "../components/InputOTPField";
import { formatPHNumber } from "../../../lib/utils/phone";
import { verifyAPI } from "../../../lib/api/verify";
import { useVerify } from "../context/VerifyPageContext";
import { useI18n } from "../../../context/I18nContext";

export default function OTPVerification() {
    const { responderDetails } = useVerify();
    const navigate = useNavigate();
    const { t } = useI18n();

    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [otpError, setOtpError] = useState<string>("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [requiresResend, setRequiresResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [devOtp, setDevOtp] = useState<string | null>(
        responderDetails?.devOtp ?? null,
    );

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (responderDetails === null) {
            navigate("/verify/phone-lookup");
        }
    }, [responderDetails, navigate]);

    const handleVerify = async (code: string) => {
        if (!responderDetails) return;
        setIsVerifying(true);
        setOtpError("");
        setRequiresResend(false);

        try {
            const res = await verifyAPI.verifyOTP({
                responderId: responderDetails.responderId,
                otp: code,
            });

            if (res.success) {
                localStorage.setItem("responderId", responderDetails.responderId);
                if (res.responderToken) {
                    localStorage.setItem("responderToken", res.responderToken);
                }
                navigate(`/home`);
            } else {
                setOtpError(
                    res.message || "Verification failed. Please try again.",
                );
                setRequiresResend(res.requiresResend);
                setOtp(new Array(6).fill(""));
                inputRefs.current?.[0]?.focus();
            }
        } catch (err) {
            if (isAxiosError(err)) {
                if (err.response?.status === 429) {
                    setOtpError("Too many attempts. Please wait a few minutes before trying again.");
                } else if (err.code === "ECONNABORTED" || !err.response) {
                    setOtpError("Network error. Please check your connection and try again.");
                } else {
                    setOtpError(
                        err.response?.data?.detail || err.response?.data?.message || "Something went wrong. Please try again.",
                    );
                }
            } else {
                setOtpError("Something went wrong. Please try again.");
            }
            setOtp(new Array(6).fill(""));
            inputRefs.current?.[0]?.focus();
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOTP = async () => {
        if (!responderDetails) return;
        setIsResending(true);
        setOtpError("");
        setResendSuccess(false);
        setDevOtp(null);

        try {
            const res = await verifyAPI.resendVerificationOTP(
                responderDetails.responderId,
            );
            setDevOtp(res.devOtp);
            setResendSuccess(true);
            setRequiresResend(false);
            setOtp(new Array(6).fill(""));
            inputRefs.current?.[0]?.focus();
        } catch {
            setOtpError("Failed to resend code. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    if (!responderDetails) {
        return null;
    }

    return (
        <Container
            headerTitle={t("verify.enterCode")}
            headerSubtitle={t("verify.enterCodeSubtitle")}
        >
            <div className="mt-5">
                <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg text-center mb-6">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {responderDetails.firstName} {responderDetails.lastName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatPHNumber(responderDetails.phoneNumber)}
                    </p>
                </div>

                {devOtp && (
                    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center dark:border-amber-700 dark:bg-amber-950/50">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                            {t("verify.demoOtp")}
                        </p>
                        <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-900 dark:text-amber-100">
                            {devOtp}
                        </p>
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <InputOTPField
                        isLoading={isVerifying}
                        disabled={requiresResend}
                        otp={otp}
                        setOtp={setOtp}
                        setErrorMessage={setOtpError}
                        handleVerify={handleVerify}
                        inputRefs={inputRefs}
                    />

                    {otpError && (
                        <p className="mt-3 text-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 py-2 px-2 border border-red-200 dark:border-red-700 rounded-md">
                            {otpError}
                        </p>
                    )}

                    {resendSuccess && (
                        <p className="mt-3 text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 py-2 px-2 border border-green-200 dark:border-green-700 rounded-md">
                            {t("verify.newCodeSent")}
                        </p>
                    )}

                    {isVerifying && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <div className="spinner w-4 h-4 border-primary border-t-transparent" />
                            <span>{t("verify.verifying")}</span>
                        </div>
                    )}

                    <div className="mt-4 text-center">
                        {requiresResend ? (
                            <button
                                onClick={handleResendOTP}
                                disabled={isResending}
                                className="text-sm font-medium text-primary dark:text-accent hover:text-primary/80 dark:hover:text-accent/80 disabled:opacity-50"
                            >
                                {isResending ? t("verify.sending") : t("verify.sendNewCode")}
                            </button>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t("verify.didntReceive")}{" "}
                                <button
                                    onClick={handleResendOTP}
                                    disabled={isResending}
                                    className="font-medium text-primary dark:text-accent hover:text-primary/80 dark:hover:text-accent/80 disabled:opacity-50"
                                >
                                    {isResending ? t("verify.sending") : t("verify.resend")}
                                </button>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
                {t("verify.agreement")}
            </p>
        </Container>
    );
}
