/**
 * Discord Command Adapter for Kelin-MD2 Plugins.
 *
 * Wraps Discord interaction objects to provide a WhatsApp-like interface
 * (sock, message, sender, args) so original plugins can run with minimal changes.
 */

import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { discordAccountKey } from "./identity.mjs";

export class DiscordAdapter {
  constructor(client, message, prefix) {
    this.client = client;
    this.message = message;
    this.prefix = prefix;
    
    // WhatsApp-like sender (normalized namespaced ID)
    this.sender = discordAccountKey(message.author.id);
    
    // WhatsApp-like message object
    this.msg = {
      key: { remoteJid: message.channelId, fromMe: message.author.id === client.user.id, id: message.id },
      pushName: message.author.username,
      message: { conversation: message.content },
      quoted: null, // TODO: Map Discord replies to WhatsApp quoted messages
    };
  }

  /**
   * Mock WhatsApp sock.sendMessage for Discord.
   */
  async sendMessage(chatId, content, options = {}) {
    const channel = await this.client.channels.fetch(chatId);
    
    if (content.text) {
      const embed = new EmbedBuilder()
        .setColor("#FFB7C5") // Sakura Pink
        .setDescription(content.text);
        
      if (content.linkPreview) {
        embed.setTitle(content.linkPreview.title || null);
        if (content.linkPreview.description) embed.setAuthor({ name: content.linkPreview.description });
        
        const thumb = content.linkPreview.jpegThumbnail || content.linkPreview.thumbnail;
        if (thumb) {
          const attachment = new AttachmentBuilder(thumb, { name: "thumbnail.jpg" });
          embed.setThumbnail("attachment://thumbnail.jpg");
          return channel.send({ embeds: [embed], files: [attachment] });
        }
      }
      
      // Handle mentions in Discord
      const mentions = Array.isArray(content.mentions) ? content.mentions : [];
      const discordMentions = mentions
        .filter(m => m.startsWith("discord:"))
        .map(m => `<@${m.split(":")[1]}>`)
        .join(" ");

      return channel.send({ 
        content: discordMentions || undefined,
        embeds: [embed] 
      });
    }

    if (content.image || content.video || content.document) {
      const media = content.image || content.video || content.document;
      const attachment = new AttachmentBuilder(media, { name: content.fileName || "file" });
      const payload = { files: [attachment] };
      if (content.caption) payload.content = content.caption;
      return channel.send(payload);
    }

    // Fallback for plain strings
    if (typeof content === "string") {
      return channel.send(content);
    }
  }

  /**
   * Helper to reply directly to the command message.
   */
  async reply(text) {
    return this.sendMessage(this.message.channelId, { text });
  }
}
