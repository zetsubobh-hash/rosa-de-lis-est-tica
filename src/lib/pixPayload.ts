/**
 * Generates a static/dynamic PIX BR Code (EMV QRCode) payload string.
 * Based on the official BCB specification.
 */

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayloadParams {
  pixKey: string;
  beneficiaryName: string;
  city?: string;
  amount?: number; // in BRL (e.g. 150.50)
}

export function generatePixPayload({
  pixKey,
  beneficiaryName,
  city = "SAO PAULO",
  amount,
}: PixPayloadParams): string {
  // Normalize
  const name = beneficiaryName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 25)
    .toUpperCase();
  const cityNorm = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .substring(0, 15)
    .toUpperCase();

  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", pixKey);
  const merchantAccount = tlv("26", gui + key);

  let payload = "";
  payload += tlv("00", "01"); // Payload Format Indicator
  payload += merchantAccount;
  payload += tlv("52", "0000"); // Merchant Category Code
  payload += tlv("53", "986"); // Transaction Currency (BRL)

  if (amount && amount > 0) {
    payload += tlv("54", amount.toFixed(2));
  }

  payload += tlv("58", "BR"); // Country Code
  payload += tlv("59", name); // Merchant Name
  payload += tlv("60", cityNorm); // Merchant City
  payload += tlv("62", tlv("05", "***")); // Additional Data

  // CRC placeholder + compute
  payload += "6304";
  const crcValue = crc16(payload);
  payload += crcValue;

  return payload;
}
