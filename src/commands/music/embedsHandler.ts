import {
  AnyThreadChannel,
  bold,
  ChatInputCommandInteraction,
  ColorResolvable,
  EmbedBuilder,
  HexColorString,
} from 'discord.js';
import { getAverageColor } from 'fast-average-color-node';
import play from 'play-dl';
import { client } from '../../client';
import {
  guildObject,
  millisecondsToString,
  numberWithSpaces,
} from '../../utils';
import { AudioPlayerPlayingState } from '@discordjs/voice';

interface defaultEmbedOptions {
  description: string;
  color?: ColorResolvable;
}

export function sendThreadEmbed(
  interaction: ChatInputCommandInteraction<'cached'>,
  thread: AnyThreadChannel<boolean>,
  options: defaultEmbedOptions
) {
  const createEmbed = new EmbedBuilder()
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setDescription(options.description.slice(0, 255))
    .setColor(options.color ? options.color : 'Default')
    .setTimestamp();

  return thread.send({ embeds: [createEmbed] });
}

export async function sendSongEmbedToThread(guildPlayer: guildObject) {
  const { queue, embed } = guildPlayer;

  // Don't should be possible, but just in case.
  if (queue[0].song.type === 'spotify') return;

  const videoData = (await play.video_info(queue[0].song.url)).video_details;
  const { title, channel, views, likes, thumbnails, url } = videoData;

  const createEmbed = new EmbedBuilder()
    .setAuthor({
      name: '💭 Сейчас играет:',
    })
    .setColor(
      (await getAverageColor(videoData.thumbnails[3].url)).hex as HexColorString
    )
    .setTitle(title as string)
    .setURL(url)
    .setFields(
      {
        name: bold(`👋 Автор`),
        value: channel ? (channel.name as string) : '',
        inline: true,
      },
      {
        name: bold(`👀 Просмотров`),
        value: numberWithSpaces(views),
        inline: true,
      },
      {
        name: bold(`👍 Лайков`),
        value: numberWithSpaces(likes),
        inline: true,
      }
    )
    .setThumbnail(thumbnails[3].url)
    .setTimestamp()
    .setFooter({ text: `📨 Запросил: ${queue[0].user}` });

  if (embed.playerThread) embed.playerThread.send({ embeds: [createEmbed] });

  return;
}

export async function createMusicEmbed(guildPlayer: guildObject) {
  try {
    const { status, queue, audioPlayer } = guildPlayer;

    // Don't should be possible, but just in case.
    if (queue[0].song.type === 'spotify') return;

    const videoData = (await play.video_info(queue[0].song.url)).video_details;
    const { title, url, thumbnails, channel, durationRaw } = videoData;

    if (!channel?.icons || !channel.name) return;

    const playerState = audioPlayer.state as AudioPlayerPlayingState;

    let { playbackDuration } = playerState;

    playbackDuration = queue[0].song.seek
      ? playbackDuration + queue[0].song.seek * 1000
      : playbackDuration;

    const progressBar = await createProgressBar(
      playbackDuration,
      videoData.durationInSec * 1000,
      8
    );

    return new EmbedBuilder()
      .setColor(
        (await getAverageColor(thumbnails[3].url)).hex as HexColorString
      )
      .setAuthor({
        name: `${channel.name}`,
        iconURL: channel.icons[2].url,
        url: channel.url,
      })
      .setTitle(title as string)
      .setURL(url)
      .setDescription(
        `${status.isPaused ? '⏸️ | ' : ''}${
          status.onRepeat ? '🔁 | ' : ''
        }🎧 ${millisecondsToString(
          playbackDuration
        )} ${progressBar} ${durationRaw}`
      )
      .setThumbnail(thumbnails[3].url)
      .setFooter({
        text: `📨 Запросил: ${queue[0].user} ${
          queue.length - 1 ? `| 🎼 Треков в очереди: ${queue.length - 1}` : ''
        }`,
      });
  } catch (e) {
    // Empty try/catch, to handle invalid thumbnail fetch.
  }
}

export async function createProgressBar(
  value: number,
  maxValue: number,
  size: number
) {
  const percentage = value / maxValue;
  const progress = Math.round(size * percentage);
  const emptyProgress = size - progress;

  return (
    `${await client.getEmoji('ProgressBarStart')}` +
    `${await client
      .getEmoji('ProgressBarPlaying')
      .then((e) => e?.repeat(progress))}` +
    `${await client.getEmoji('ProgressBarMedium')}` +
    `${await client
      .getEmoji('ProgressBarWaiting')
      .then((e) => e?.repeat(emptyProgress))}` +
    `${await client.getEmoji('ProgressBarEnd')}`
  );
}
