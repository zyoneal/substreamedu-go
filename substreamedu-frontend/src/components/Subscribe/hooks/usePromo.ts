import { useState } from 'react';
import { useIntl } from 'react-intl';
import { axiosService } from '../../../services/AxiosService';
import { urls } from '../../../constants/urls';

export const usePromo = () => {
    const intl = useIntl();
    const [promoCode, setPromoCode] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const applyPromo = async () => {
        if (!promoCode.trim()) {
            setStatus("error");
            setMessage(intl.formatMessage({ id: "paymentPage.promo.empty", defaultMessage: "Please enter a code" }));
            return;
        }

        setStatus("loading");
        setMessage("");

        try {
            const response = await axiosService.post(urls.auth.promo, { code: promoCode });
            setStatus("success");
            setMessage(response.data.data?.message || "Premium activated.");
            setPromoCode("");

            // Reload for state sync
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            setStatus("error");
            
            const errorMsg = error.response?.data?.message ||
                intl.formatMessage({ id: "paymentPage.promo.invalid", defaultMessage: "Invalid code" });
            setMessage(errorMsg);
        }
    };

    const resetStatus = () => {
        if (status !== 'idle' && status !== 'loading') {
            setStatus('idle');
            setMessage('');
        }
    };

    return {
        promoCode,
        setPromoCode,
        status,
        message,
        applyPromo,
        resetStatus
    };
};
