/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { browser } from "@web/core/browser/browser";

async function copyWithClipboardApi(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        return false;
    }
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        return false;
    }
}

function copyWithExecCommandFallback(text) {
    let succeeded = false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    try {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        succeeded = !!(document.execCommand && document.execCommand("copy"));
    } catch (error) {
        succeeded = false;
    } finally {
        document.body.removeChild(textarea);
    }
    return succeeded;
}

async function copyToClipboard(value) {
    const text = value === null || value === undefined ? "" : String(value);

    // 1. Try the modern async Clipboard API first.
    const modernSucceeded = await copyWithClipboardApi(text);
    if (modernSucceeded) {
        return true;
    }

    // 2. Fall back to the legacy textarea + execCommand('copy') approach.
    const fallbackSucceeded = copyWithExecCommandFallback(text);
    return fallbackSucceeded;
}

export class CopyButtonField extends Component {
    static template = "quick_copy_fields.CopyButtonField";
    static props = { ...standardFieldProps };

    setup() {
        this.notification = useService("notification");
        this.state = useState({ copied: false });
        this.copiedTimeoutId = null;
    }

    get value() {
        return this.props.record.data[this.props.name];
    }

    async onCopyClick() {
        const success = await copyToClipboard(this.value || "");

        // Clear any pending reset from a previous rapid click so the
        // checkmark duration doesn't get cut short or flicker.
        if (this.copiedTimeoutId) {
            browser.clearTimeout(this.copiedTimeoutId);
            this.copiedTimeoutId = null;
        }

        if (success) {
            this.state.copied = true;
            this.copiedTimeoutId = browser.setTimeout(() => {
                this.state.copied = false;
                this.copiedTimeoutId = null;
            }, 1500);
            this.notification.add("Copied", { type: "success" });
        } else {
            // Only reached when BOTH the Clipboard API and the
            // execCommand fallback have failed.
            this.notification.add("Copy failed", { type: "danger" });
        }
    }
}

registry.category("fields").add("quick_copy_field", {
    component: CopyButtonField,
});

export default CopyButtonField;
