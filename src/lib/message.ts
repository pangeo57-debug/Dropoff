import { makeEntry, parseAmount, type InboxEntry } from './inbox'

const CUR = '(?:€|EUR|ευρώ|ευρω|euro|euros)'
const NUM = '(\\d{1,3}(?:[.\\s]\\d{3})*(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)'
const INCOME = /(λάβατε|λαβατε|πιστώθηκε|πιστωθηκε|πίστωση|πιστωση|έλαβες|ελαβες|εισπράξατε|credited|received|you got|deposit|μεταφορά από|εισερχόμεν)/i
const EXPENSE = /(εμβασμα|έμβασμα|εκτελέσατε|εκτελεσατε|χρέωση|χρεωση|χρεώθηκε|πληρωμή|πληρωμη|αγορά|αγορα|ανάληψη|αναληψη|debited|payment|purchase|you paid|paid|withdraw|spent)/i

/** Pull the amount out of free text like "Χρέωση 12,50€ στο ΕΚΟ" or "You paid €3.50 to Starbucks". */
export function findAmount(text: string): number {
  const patterns = [
    new RegExp(`${NUM}\\s*${CUR}`, 'i'), //  12,50€  /  12.50 EUR
    new RegExp(`${CUR}\\s*${NUM}`, 'i'), //  €12.50
    new RegExp(`(?:ποσό|ποσο|amount|χρέωση|χρεωση|αξία|αξια)\\s*[:\\-]?\\s*${NUM}`, 'i'),
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const n = parseAmount(m[1])
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  return NaN
}

// JS \b only knows ASCII letters, so word ends are matched with a lookahead
const STOP = /\s+(?:με την|με τη|με κάρτα|με καρτα|με|στις|στην|την|μέσω|μεσω|via|τηλ|on|with|using|ref|αρ\.|\*+\d|κάρτα|καρτα|card|\d{1,2}[/.]\d{1,2})(?=\s|$).*$/i
const LEAD = /^(?:χρέωση|χρεωση|χρεώθηκε|πληρωμή|πληρωμη|αγορά|αγορα|ανάληψη|αναληψη|λάβατε|λαβατε|πιστώθηκε|πιστωθηκε|debited|credited|payment|purchase|you paid|paid|received|withdrawal)\s*(?:κάρτας|καρτας|card)?\s*(?:από|απο|from)?\s*/i

/** Best-effort merchant / counterparty ("στο ΕΚΟ ΠΑΤΡΑΣ", "to Starbucks", "από ΓΙΩΡΓΟΣ"). */
export function findMerchant(text: string, income: boolean): string {
  const t = text.replace(/\s+/g, ' ').trim()
  // bank transfers: "ΠΡΟΣ: EUROBANK S.A. ΔΙΚ.: WHITE SAILING ΤΗΛ. ΤΡΑΠ. …" → the beneficiary (ΔΙΚ.) is the one that matters
  const ben = !income && t.match(/(?:ΔΙΚ|δικ)\.?\s*:\s*(.+?)(?=\s+(?:ΤΗΛ|τηλ)|$)/)
  if (ben) return ben[1].trim().slice(0, 60)
  const re = income ? /(?:^|\s)(?:από|απο|from)\s+([^.;\n]+)/i : /(?:^|\s)(?:στο|στον|στην|στη|στα|σε|at|to|@)\s+([^.;\n]+)/i
  const m = t.match(re)
  let name = m ? m[1] : t.replace(new RegExp(`${NUM}\\s*${CUR}|${CUR}\\s*${NUM}`, 'gi'), ' ').replace(/\s+/g, ' ').trim().replace(LEAD, '')
  name = name.replace(STOP, '').replace(/[*]+\d+/g, '').replace(/[,;:\-–]+$/, '').trim()
  return name.slice(0, 60)
}

/** Turn a pasted/shared bank message into an entry. `dateIso` is when the message arrived. */
export function parseMessage(id: string, dateIso: string, text: string): InboxEntry | null {
  const amount = findAmount(text)
  if (!Number.isFinite(amount) || amount <= 0) return null
  // whichever keyword comes first decides ("Λάβατε … μέσω IRIS payments" mentions "payment" too)
  const inc = text.search(INCOME)
  const exp = text.search(EXPENSE)
  const income = inc >= 0 && (exp < 0 || inc < exp)
  return makeEntry(id, dateIso, String(amount), findMerchant(text, income), income ? 'in' : '')
}
