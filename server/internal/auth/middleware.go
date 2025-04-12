package auth

import (
	"awesomeChat/package/logger"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		logger.Log.Infoln("HI IM censorship")
	}
}
