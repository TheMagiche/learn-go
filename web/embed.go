// Package web embeds the built React app so `todo serve` can ship one binary.
package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// Dist returns the embedded frontend rooted at index.html.
func Dist() (fs.FS, error) {
	// LEARN(embed): The //go:embed line above copies web/dist into the binary when it is compiled. There is no separate static folder to deploy. fs.Sub steps into dist so the server reads index.html at the root of this filesystem.
	return fs.Sub(distFS, "dist")
}
