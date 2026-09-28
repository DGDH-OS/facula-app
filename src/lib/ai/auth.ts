import { ExternalAccountClient, GoogleAuth } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";

const SCOPES = ["https://www.googleapis.com/auth/cloud-platform"];

/**
 * Twee authenticatiepaden naar Vertex AI, geen van beide met een key-file:
 *
 * 1. Op Vercel (productie/preview): Workload Identity Federation. Vercel geeft
 *    elke functie-invocatie een eigen OIDC-token; Google STS wisselt dat in
 *    voor een access token van het service-account. Er staat dus nooit een
 *    service-account-sleutel in een env-var of in de repo. Actief zodra
 *    GCP_WIF_PROVIDER gezet is.
 * 2. Lokaal: Application Default Credentials (gcloud auth application-default
 *    login). Geen extra configuratie nodig buiten GCP_PROJECT_ID.
 *
 * Alle waarden komen uit de omgeving. Ontbreekt er een, dan faalt dit met een
 * duidelijke melding en valt de aanroeper terug op het volgende model of op de
 * sjabloongenerator; het wordt nooit stil genegeerd.
 */

function vereist(naam: string): string {
  const waarde = process.env[naam];
  if (!waarde) {
    throw new Error("Ontbrekende omgevingsvariabele voor Vertex AI: " + naam);
  }
  return waarde;
}

export function gebruiktWorkloadIdentity(): boolean {
  return Boolean(process.env.GCP_WIF_PROVIDER);
}

let gedeeldeGoogleAuth: GoogleAuth | null = null;

/**
 * Haalt een access token op voor de Vertex AI REST-API. Bewust een token en
 * geen SDK-client: de aanroep zelf is een enkele fetch (zie vertex.ts), dus een
 * extra clientlaag zou alleen een afhankelijkheid en een koudestart kosten.
 */
export async function haalAccessToken(): Promise<string> {
  if (gebruiktWorkloadIdentity()) {
    const projectNumber = vereist("GCP_PROJECT_NUMBER");
    const pool = vereist("GCP_WIF_POOL");
    const provider = vereist("GCP_WIF_PROVIDER");
    const serviceAccount = vereist("GCP_SERVICE_ACCOUNT_EMAIL");

    const client = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience:
        "//iam.googleapis.com/projects/" +
        projectNumber +
        "/locations/global/workloadIdentityPools/" +
        pool +
        "/providers/" +
        provider,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url:
        "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
        serviceAccount +
        ":generateAccessToken",
      subject_token_supplier: {
        getSubjectToken: getVercelOidcToken,
      },
    });

    if (!client) {
      throw new Error("Workload Identity Federation kon geen client opzetten.");
    }
    client.scopes = SCOPES;

    const token = await client.getAccessToken();
    if (!token.token) {
      throw new Error("Workload Identity Federation gaf geen access token terug.");
    }
    return token.token;
  }

  gedeeldeGoogleAuth = gedeeldeGoogleAuth ?? new GoogleAuth({ scopes: SCOPES });
  const token = await gedeeldeGoogleAuth.getAccessToken();
  if (!token) {
    throw new Error(
      "Geen Google-credentials gevonden. Lokaal: gcloud auth application-default login."
    );
  }
  return token;
}
