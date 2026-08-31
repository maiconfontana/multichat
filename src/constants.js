Constants = {
	appName : "MultiChat",
	offsets : {
		window: { x: 0, y: 0, width: 0, height: 0 },
		view: { x: 0, y: 0, width: 0, height: 0 }
	},
	sidebar : {
		width: 280,
		collapsedWidth: 72
	},
	event   : {},
	whatsapp: {},
	services: {
		whatsapp: {
			name: "WhatsApp",
			url: "https://web.whatsapp.com/",
			icon: "whatsapp",
			color: "#25d366",
			preload: "whatsapp-preload.js"
		},
		teams: {
			name: "Microsoft Teams",
			url: "https://teams.microsoft.com/v2/",
			icon: "microsoft-teams",
			color: "#5059c9",
			preload: "messenger-preload.js"
		},
		telegram: {
			name: "Telegram",
			url: "https://web.telegram.org/a/",
			icon: "telegram",
			color: "#2aabee",
			preload: "messenger-preload.js"
		},
		discord: {
			name: "Discord",
			url: "https://discord.com/app",
			icon: "discord",
			color: "#5865f2",
			preload: "messenger-preload.js"
		},
		slack: {
			name: "Slack",
			url: "https://app.slack.com/client",
			icon: "slack",
			color: "#4a154b",
			preload: "messenger-preload.js"
		},
		custom: {
			name: "Personalizado (URL)",
			url: "https://",
			icon: "globe",
			color: "#00a884",
			preload: "messenger-preload.js"
		}
	}
};

Constants.version = "1.4.0";

Constants.whatsapp.url       = "https://web.whatsapp.com/";
Constants.whatsapp.userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";

Constants.event.initResources           = "init-resources";
Constants.event.initWhatsAppInstance    = "init-whatsapp-instance";
Constants.event.initGenericInstance     = "init-generic-instance";
Constants.event.clearWorkersAndReload   = "clear-workers-and-reload";
Constants.event.reloadWhatsAppInstance  = "reload-whatsapp-instance";
Constants.event.updateUnreadMessages    = "update-unread-messages";
Constants.event.newRendererNotification = "new-renderer-notification";
Constants.event.fireNotificationClick   = "fire-notification-click";
Constants.event.buildBadgeIcon          = "build-badge-icon";
Constants.event.updateBadgeIcon         = "set-updated-badge-icon";

Constants.event.getAccountsList         = "get-accounts-list";
Constants.event.addAccount              = "add-account";
Constants.event.updateAccount           = "update-account";
Constants.event.deleteAccount           = "delete-account";
Constants.event.gotoAccount             = "goto-account";
Constants.event.reloadAccounts          = "reload-accounts";
Constants.event.activeAccount           = "active-account";
Constants.event.updateUnread            = "update-unread";
Constants.event.toggleNotifications     = "toggle-notifications";
Constants.event.toggleSidebar           = "toggle-sidebar";
Constants.event.sidebarState            = "sidebar-state";

Constants.event.getShareSources   = "get-share-sources";
Constants.event.setShareSelected  = "set-share-selected";
Constants.event.setShareCancelled = "set-share-cancelled";

const init = (lang) => {
	switch (lang) {
		case "pt-BR":
			Constants.whatsapp.profilePicture   = /foto do perfil|conversas/i;
			Constants.whatsapp.unreadText       = "Não lidas";
			Constants.whatsapp.unreadTextSearch = /[0-9]+ mensage(m|ns)? não lida(s)?/;
			break;
	}
	switch (process.platform) {
		case "win32":
			Constants.offsets.view.width  = -15;
			Constants.offsets.view.height = -60;
			Constants.whatsapp.userAgent  = Constants.whatsapp.userAgent.replace("X11; Linux x86_64", "Windows NT 10.0; Win64; x64");
			break;
	}
	return Constants;
};

module.exports = { init };
