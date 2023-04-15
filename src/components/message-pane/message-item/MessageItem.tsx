import styles from './styles.module.scss';
import { classNames, conditionalClass } from '@/common/classNames';
import { formatTimestamp } from '@/common/date';
import Avatar from '@/components/ui/Avatar';
import Icon from '@/components/ui/icon/Icon';
import { MessageType, RawAttachment, RawMessage } from '@/chat-api/RawData';
import { Message, MessageSentStatus } from '@/chat-api/store/useMessages';
import { deleteMessage } from '@/chat-api/services/MessageService';
import RouterEndpoints from '@/common/RouterEndpoints';
import { Link, useNavigate, useParams } from '@nerimity/solid-router';
import useStore from '@/chat-api/store/useStore';
import { createEffect, createRenderEffect, createSignal, on, onMount, Show } from 'solid-js';
import MemberContextMenu from '@/components/member-context-menu/MemberContextMenu';
import { Markup } from '@/components/Markup';
import Modal from '@/components/ui/Modal';
import { useCustomPortal } from '@/components/ui/custom-portal/CustomPortal';
import Text from '@/components/ui/Text';
import { css, styled } from 'solid-styled-components';
import { FlexColumn, FlexRow } from '@/components/ui/Flexbox';
import Button from '@/components/ui/Button';
import { ROLE_PERMISSIONS } from '@/chat-api/Bitwise';
import { avatarUrl } from '@/chat-api/store/useUsers';
import { useWindowProperties } from '@/common/useWindowProperties';


function FloatOptions(props: { message: RawMessage, isCompact?: boolean | number }) {
  const params = useParams<{serverId: string}>();
  const {account, serverMembers} = useStore();
  const {createPortal} = useCustomPortal();

  const onDeleteClick = () => {
    createPortal?.(close => <DeleteMessageModal close={close} message={props.message}/>)
  }
  const onEditClick = () => {
    const {channelProperties} = useStore();
    channelProperties.setEditMessage(props.message.channelId, props.message);
  }
  const showEdit = () => account.user()?.id === props.message.createdBy.id && props.message.type === MessageType.CONTENT;

  const showDelete = () => {
    if (account.user()?.id === props.message.createdBy.id) return true;
    if (!params.serverId) return false;

    const member = serverMembers.get(params.serverId, account.user()?.id!);
    return member?.hasPermission?.(ROLE_PERMISSIONS.MANAGE_CHANNELS);
  }

  
  return (
    <div class={styles.floatOptions}>
      {props.isCompact && (<div class={styles.floatDate}>{formatTimestamp(props.message.createdAt)}</div>)}
      <Show when={showEdit()} ><div class={styles.item} onclick={onEditClick}><Icon size={18} name='edit' class={styles.icon} /></div></Show>
      <Show when={showDelete()}><div class={styles.item} onClick={onDeleteClick}><Icon size={18} name='delete' class={styles.icon} color='var(--alert-color)' /></div></Show>
      <div class={styles.item}><Icon size={18} name='more_vert' class={styles.icon} /></div>
    </div>
  )
}

interface MessageItemProps { 
  class?: string;
  message: Message;
  beforeMessage?: Message;
  animate?: boolean;
  hideFloating?: boolean;
  messagePaneEl?: HTMLDivElement;
 }

const MessageItem = (props: MessageItemProps) => {
  
  const [contextPosition, setContextPosition] = createSignal<{x: number, y: number} | undefined>(undefined);
  const params = useParams();
  const {serverMembers} = useStore();
  const [hovered, setHovered] = createSignal(false);
  const serverMember = () => params.serverId ? serverMembers.get(params.serverId, props.message.createdBy.id) : undefined;

  const systemMessage = () => {
    switch (props.message.type) {
      case MessageType.JOIN_SERVER:
        return {icon: "", message: "has joined the server."}
      case MessageType.LEAVE_SERVER:
        return {icon: "", message: "has left the server."}
      case MessageType.KICK_USER:
        return {icon: "", message: "has been kicked."}
      case MessageType.BAN_USER:
        return {icon: "", message: "has been banned."}
      default:
        return undefined;
    }
  }

  const onMemberContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextPosition({x: event.clientX, y: event.clientY});
  }

  createEffect(on(() => props.message.attachments, () => {
    if (!props.messagePaneEl) return;
    props.messagePaneEl.scrollTop = props.messagePaneEl.scrollHeight;
  }, {defer: true}))
  
  const Details = () => (
    <div class={classNames(styles.details, conditionalClass(systemMessage(), styles.systemMessageDetails))}>
      <Link onContextMenu={onMemberContextMenu} href={RouterEndpoints.PROFILE(props.message.createdBy.id)} class={styles.avatar}>
        <Avatar animate={hovered()} user={props.message.createdBy} size={systemMessage() ? 23 : 40} />
      </Link>
      <Link onContextMenu={onMemberContextMenu} class={styles.username} href={RouterEndpoints.PROFILE(props.message.createdBy.id)} style={{color: serverMember()?.roleColor()}}>
        {props.message.createdBy.username}
      </Link>
      <Show when={systemMessage()}>
        <div class={styles.systemMessage}>{systemMessage()?.message}</div>
      </Show>
      <div class={styles.date}>{formatTimestamp(props.message.createdAt)}</div>
    </div>
  )

  const currentTime = props.message?.createdAt;
  const beforeMessageTime = () => props.beforeMessage?.createdAt!

  const isSameCreator = () => props.beforeMessage && props.beforeMessage?.createdBy?.id === props.message?.createdBy?.id;
  const isDateUnderFiveMinutes = () => beforeMessageTime && (currentTime - beforeMessageTime()) < 300000;


  const isCompact = () => isSameCreator() && isDateUnderFiveMinutes();


  const editedAt = () => {
    if (!props.message.editedAt) return;
    return "Edited at " + formatTimestamp(props.message.editedAt);
  }

  return (
    <div onmouseover={() => setHovered(true)} onmouseout={()=>setHovered(false)} class={classNames(styles.messageItem, conditionalClass(isCompact(), styles.compact), conditionalClass(props.animate, styles.animate), props.class, "messageItem")}>
      <MemberContextMenu user={props.message.createdBy} position={contextPosition()} serverId={params.serverId} userId={props.message.createdBy.id} onClose={() => setContextPosition(undefined)} />
      <Show when={!props.hideFloating}><FloatOptions isCompact={isCompact()} message={props.message} /></Show>
      <div class={styles.messageItemOuterContainer}>
        <div class={styles.messageItemContainer}>
          <Show when={!isCompact()}><Details /></Show>
          <Show when={!systemMessage()}>
            <div class={styles.messageContainer}>
              {props.message.sentStatus === MessageSentStatus.FAILED && <Icon name='error_outline' size={14} color="var(--alert-color)" class={styles.messageStatus} />}
              {props.message.sentStatus === MessageSentStatus.SENDING && <Icon name='query_builder' size={14} color="rgba(255,255,255,0.4)" class={styles.messageStatus} />}
              <div class={styles.content}>
                <Markup message={props.message} text={props.message.content || ''} />
                {(!props.message.sentStatus && editedAt()) && <Icon name='edit' size={14} color="rgba(255,255,255,0.4)" class={styles.messageEditStatus} title={editedAt()} />}  
                <Embeds message={props.message} hovered={hovered()} />
                {props.message.uploadingAttachment ? `Uploading ${props.message.uploadingAttachment.name}...` : ''}
              </div>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;



function Embeds(props: {message: Message, hovered: boolean}){
  return (
    <div>
      <Show when={props.message.attachments?.[0]}>
        <ImageEmbed attachment={props.message.attachments?.[0]!} />
      </Show>
    </div>
  )
}


function ImageEmbed(props: {attachment: RawAttachment}) {
  const {paneWidth, height, hasFocus} = useWindowProperties();
  const isGif = () => props.attachment.path.endsWith(".gif")
  const {createPortal} = useCustomPortal();

  const url = () => {
    let url = `https://cdn.nerimity.com/${props.attachment.path}`;
    if (!isGif()) return url;
    if (!hasFocus()) url+= "?type=webp"; 
    return url;
  }

  const style = () => {
    const maxWidth = clamp(paneWidth()! - 70, 600)
    return clampImageSize(props.attachment.width!, props.attachment.height!, maxWidth, height() / 2)
  }

  const onClicked =() => {
    createPortal(close => <ImagePreviewModal close={close} url={url()} width={props.attachment.width} height={props.attachment.height} />)
  }

  return (
    <div onclick={onClicked} class={classNames(styles.imageEmbed, conditionalClass(isGif() && !hasFocus(), styles.gif))}>
      <img loading="lazy" src={url()} style={style()} alt="" />
    </div>
  )
}


const ImagePreviewContainer = styled(FlexRow)`
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  inset: 0;
  background: rgba(0,0,0,0.9);
  img {
    border-radius: 8px;
  }
`;


function ImagePreviewModal(props: {close: () => void, url: string, width?: number, height?: number}) {
  const {width, height} = useWindowProperties();

  const style = () => {
    const maxWidth = clamp(width(), width() / 100 * 80);
    const maxHeight = clamp(height(), height() / 100 * 80);
    return clampImageSize(props.width!, props.height!, maxWidth, maxHeight)
  }

  const onClick = (event: any) => {
    const target = event.target as HTMLDivElement;
    if (!target.classList.contains("background")) return;
    props.close()
  }

  return (
    <ImagePreviewContainer onclick={onClick} class="background">
      <img src={props.url} style={style()}></img>
    </ImagePreviewContainer>
  )
}



function clamp(num: number, max: number) {
  return num >= max ? max : num;
}


function clampImageSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  const aspectRatio = width / height;
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  return { width: width + "px", height: height + "px" };
}







const DeleteMessageModalContainer = styled(FlexColumn)`
  overflow: auto;
`;
const deleteMessageItemContainerStyles = css`
  padding-top: 5px;
  border-radius: 8px;
  margin-top: 5px;
  background-color: var(--pane-color);
  &&{
    &:hover {
      background-color: var(--pane-color);
    }

  }
`

const deleteMessageModalStyles = css`
  max-width: 600px;
  max-height: 600px;
  overflow: hidden;
`

function DeleteMessageModal(props: {message: Message, close: () => void}) {

  const onDeleteClick = () => {
    props.close();
    deleteMessage({channelId: props.message.channelId, messageId: props.message.id});
  }

  const ActionButtons = (
    <FlexRow style={{"justify-content": "flex-end", flex: 1, margin: "5px" }}>
      <Button onClick={props.close} iconName="close" label="Cancel" />
      <Button onClick={onDeleteClick} iconName="delete" color='var(--alert-color)' label="Delete" />
    </FlexRow>
  )

  return (
    <Modal close={props.close} title='Delete Message?'icon='delete' class={deleteMessageModalStyles} actionButtons={ActionButtons}>
      <DeleteMessageModalContainer>
        <Text>Are you sure you would like to delete this message?</Text>
          <MessageItem class={deleteMessageItemContainerStyles} hideFloating message={props.message} />
      </DeleteMessageModalContainer>
    </Modal>
  )
}