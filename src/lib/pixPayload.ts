/**
 * Generates a PIX BR Code (EMV QRCode) payload string.
 * Based on the official BCB/Banco Central specification.
 */

function tlv(id: string, value: string): string {
  // EMV TLV: ID (2 chars) + Length (2 chars, zero-padded) + Value
  const len = value.length.toString(10).padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16CCITT(str: string): string {
  const polynomial = 0x1021;
  let crc = 0xffff;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadParams {
  pixKey: string;
  beneficiaryName: string;
  city?: string;
  amount?: number; // in BRL (e.g. 150.50)
  txid?: string;
}

export function generatePixPayload({
  pixKey,
  beneficiaryName,
  city = "SAO PAULO",
  amount,
  txid = "***",
}: PixPayloadParams): string {
  // Normalize text: remove accents, limit lengths, uppercase
  const normalizeName = (text: string, maxLen: number) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .substring(0, maxLen)
      .toUpperCase()
      .trim();

  const name = normalizeName(beneficiaryName || "LOJA", 25);
  const cityNorm = normalizeName(city, 15);

  // Build Merchant Account Information (ID 26)
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", pixKey);
  const merchantAccountInfo = tlv("26", gui + key);

  // Build Additional Data Field (ID 62)
  const additionalData = tlv("62", tlv("05", txid));

  // Assemble payload (order matters per spec)
  let payload = "";
  payload += tlv("00", "01");           // ID 00: Payload Format Indicator
  payload += merchantAccountInfo;       // ID 26: Merchant Account Info
  payload += tlv("52", "0000");         // ID 52: Merchant Category Code
  payload += tlv("53", "986");          // ID 53: Transaction Currency (BRL = 986)

  if (amount && amount > 0) {
    payload += tlv("54", amount.toFixed(2)); // ID 54: Transaction Amount
  }

  payload += tlv("58", "BR");           // ID 58: Country Code
  payload += tlv("59", name);           // ID 59: Merchant Name
  payload += tlv("60", cityNorm);       // ID 60: Merchant City
  payload += additionalData;            // ID 62: Additional Data Field

  // ID 63: CRC16 — append the tag + length ("6304") then compute CRC over everything
  payload += "6304";
  const crc = crc16CCITT(payload);
  payload += crc;

  return payload;
}
