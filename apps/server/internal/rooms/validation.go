package rooms

import "github.com/opensovereignchess/osc-ui/apps/server/internal/protocol"

// ValidateMoveShape checks action fields, not Sovereign Chess legality.
func ValidateMoveShape(move protocol.ClientMove) error {
	kind := move.Kind
	if kind == "" {
		kind = "move"
	}
	switch kind {
	case "move", "castle":
		if move.Orig == "" || move.Dest == "" || move.Orig == move.Dest {
			return ErrBadSequence
		}
	case "defect":
		if move.Color == "" {
			return ErrBadSequence
		}
	default:
		return ErrBadSequence
	}
	return nil
}
