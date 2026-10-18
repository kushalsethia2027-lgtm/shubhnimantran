import invitationVideo from "@/assets/aarav-meera.mp4";
import invitationPoster from "@/assets/aarav-meera-poster.png";

/** A self-contained sample invitation with its spoken audio in the video file. */
export function InvitePlayer({
  label = "Aarav and Meera wedding invitation sample video with sound",
  showCaption = true,
}: {
  label?: string;
  showCaption?: boolean;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <video
        className="arch block aspect-[9/16] w-full border border-gold/60 bg-maroon object-cover shadow-lg"
        src={invitationVideo}
        poster={invitationPoster}
        controls
        playsInline
        preload="metadata"
        aria-label={label}
      >
        Your browser does not support video playback.
      </video>
      {showCaption && (
        <p className="mt-3 text-center text-xs text-champagne/70">
          Play the Aarav and Meera sample with sound — yours is recorded in your own voice.
        </p>
      )}
    </div>
  );
}
