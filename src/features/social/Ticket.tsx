import { CategoryIcon } from "./CategoryIcon";
import { Download, TicketCheck } from "lucide-react";
import { categoryFor, when, type Scene, type Booking } from "./domain";
export function Ticket({ event, booking }: { event: Scene; booking?: Booking }) {
  const c = categoryFor(event.category);
  const confirmed = booking?.status === "confirmed" || booking?.status === "checked_in";
  function download() {
    const esc = (v: string) =>
      v
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
    const words = event.title.split(" ").flatMap((word) => word.match(/.{1,22}/g) ?? []);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      if ((line + " " + word).length > 22 && line) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1040" viewBox="0 0 720 1040"><rect width="720" height="1040" rx="28" fill="${c.color}"/><g fill="none" stroke="#fff2d8" opacity=".16" stroke-width="3"><circle cx="625" cy="260" r="140"/><circle cx="625" cy="260" r="170"/><circle cx="625" cy="260" r="200"/></g><g fill="#fff2d8" font-family="Arial,sans-serif"><text x="55" y="88" font-size="45" font-weight="bold">nimantran *</text><text x="55" y="165" font-size="16" letter-spacing="4">${esc(c.ticket)}</text>${lines
      .slice(0, 5)
      .map(
        (t, i) =>
          `<text x="55" y="${250 + i * 62}" font-size="48" font-weight="bold">${esc(t)}</text>`,
      )
      .join(
        "",
      )}<text x="55" y="590" font-size="22">${esc(when(event.starts_at))} IST</text><text x="55" y="630" font-size="22">${esc(event.neighbourhood)}, ${esc(event.city)}</text><text x="55" y="690" font-size="26" font-weight="bold">${esc(booking?.guest_name ?? "Guest")}</text><path d="M0 748H720" stroke="#fff2d8" stroke-dasharray="12 10"/><text x="55" y="810" font-size="16" letter-spacing="2">YOUR INVITATION IS CONFIRMED</text><text x="55" y="850" font-size="14">Booking: ${esc(booking?.id ?? "")}</text><text x="55" y="890" font-size="14">Check-in: ${esc(booking?.checkin_code ?? "")}</text><text x="55" y="952" font-size="15">Keep this code private. Open My plans for the exact venue.</text><text x="55" y="985" font-size="15">ni-man-tran.app</text></g><circle cx="0" cy="748" r="22" fill="#f9f5ed"/><circle cx="720" cy="748" r="22" fill="#f9f5ed"/></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-nimantran-ticket.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div
      className={`ticket-theme ${event.category}`}
      style={{ "--ticket-color": c.color } as React.CSSProperties}
      data-clarity-mask="true"
    >
      <div className="ticket-top">
        <span>
          nimantran<span className="brand-star">✳︎</span>
        </span>
        <TicketCheck size={27} />
      </div>
      <div className="ticket-symbol">
        <CategoryIcon category={c.id} size={90} />
      </div>
      <p className="eyebrow">{c.ticket}</p>
      <h3>{event.title}</h3>
      <div className="ticket-details">
        <span>{when(event.starts_at)}</span>
        <span>
          {event.neighbourhood} · {event.city}
        </span>
        <strong>{booking?.guest_name ?? "Your name goes here"}</strong>
      </div>
      <div className="ticket-perf" />
      <div className="ticket-bottom">
        <span>
          {confirmed ? "YOUR INVITATION IS CONFIRMED" : "DESIGN PREVIEW · NOT VALID FOR ENTRY"}
        </span>
        {confirmed && (
          <>
            <code>{booking?.checkin_code}</code>
            <button className="s-btn" onClick={download}>
              <Download size={16} /> Download invitation
            </button>
            <button className="s-link" onClick={() => window.print()}>
              Print / save as PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}
