import { LocalAudioTrack, RemoteAudioTrack } from 'twilio-video'
import useIsTrackEnabled from '../useIsTrackEnabled/useIsTrackEnabled'

/*
 * Whether a participant has deliberately muted this audio track (it exists and is
 * disabled). No track is not "muted": the participant has not published audio, or it
 * has not arrived yet.
 *
 * The answer is read from the track itself. useIsTrackEnabled keeps its value in
 * state and only catches up with a new track in an effect, so for the one render in
 * which an unmuted participant's track first arrives it still says "not enabled";
 * using it directly would flash the Muted pill on every join. It is called here for
 * its subscription to the track's enabled/disabled events, which re-render the tile.
 */
export default function useIsTrackMuted(
    track: LocalAudioTrack | RemoteAudioTrack | undefined | null
): boolean {
    useIsTrackEnabled(track ?? undefined)
    return Boolean(track) && !track!.isEnabled
}
