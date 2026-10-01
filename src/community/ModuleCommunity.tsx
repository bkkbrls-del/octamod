import { useEffect, useState } from 'react'
import { api, apiFetch, post } from './api'
import { apiUrl, assetUrl } from '../hosting'
import { MODULE_DOCUMENTS_BY_ID } from '../catalog/documents'
import type { PublicMedia } from './api'
import { useCommunity } from './context'
import { Icon } from '../components/Icon'
import { ModulePopularity } from './ModulePopularity'
type Data = {comments:{id:string;body:string;created_at:string;author:string;canDelete:boolean}[];ratings:{average:number|null;count:number};ownRating:number;likes:number;liked:boolean;downloads?:number;downloadsStarted?:string|null;media:PublicMedia[]}
function MediaPreview({item,privatePreview}:{item:PublicMedia;privatePreview:boolean}) {
  const [preview,setPreview]=useState<{id:string;url:string}|null>(null),[error,setError]=useState('')
  useEffect(()=>{
    if(!privatePreview)return
    let cancelled=false,url=''
    void apiFetch('/media/'+item.id).then(async result=>{
      if(!result.ok)throw new Error('This preview could not be loaded.')
      const blob=await result.blob()
      if(cancelled)return
      url=URL.createObjectURL(blob);setPreview({id:item.id,url})
    }).catch(error=>{if(!cancelled)setError(error.message)})
    return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)}
  },[item.id,privatePreview])
  const url=privatePreview?(preview?.id===item.id?preview.url:''):apiUrl('/media/'+item.id)
  return <figure>{error?<p className="file-error" role="alert">{error}</p>:!url?<p role="status">Loading preview…</p>:item.kind==='image'?<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.caption} loading="lazy" /></a>:<audio controls preload="none" src={url}>Audio preview</audio>}<figcaption>{item.caption}<span>{item.capture_type==='hardware'?'Hardware capture':item.capture_type==='emulator'?'Emulator capture':'Audio preview'}</span></figcaption></figure>
}
export function MediaGallery({media,privatePreview=false}:{media:PublicMedia[];privatePreview?:boolean}) {
  return <div className="media-gallery">{media.map(item=><MediaPreview key={item.id} item={item} privatePreview={privatePreview}/>)}</div>
}
export function ModuleCommunity({id,mode='all'}:{id:string;mode?:'all'|'media'|'discussion'}) {
  const {session,refresh} = useCommunity()
  const document=MODULE_DOCUMENTS_BY_ID[id],sourceMedia=document?.media??[]
  const [data,setData] = useState<Data | null>(null), [comment,setComment] = useState(''), [rating,setRating] = useState(0), [error,setError] = useState(''), [busy,setBusy] = useState(false), [notice,setNotice] = useState(''), [displayName,setDisplayName]=useState('')
  useEffect(() => {
    let cancelled=false
    if (session.available) void api<Data>('/modules/' + id).then(value => {if (!cancelled) {setData(value);setRating(value.ownRating)}}).catch(error => {if(!cancelled)setError(error.message)})
    return () => {cancelled=true}
  },[id,session.available,session.user?.id])
  async function send(kind:'comments'|'rating'|'like') {
    setBusy(true);setError('');setNotice('')
    try {
      await post('/modules/' + id + '/' + kind,kind==='comments'?{body:comment,displayName}:kind==='like'?{liked:!data?.liked,displayName}:{value:rating,displayName})
      await refresh();setData(await api<Data>('/modules/' + id)); if(kind==='comments')setComment('')
      setNotice(kind==='comments'?'Comment posted.':kind==='like'?(data?.liked?'Like removed.':'Liked.'):'Rating saved.')
    } catch(error){setError(error instanceof Error?error.message:'Unable to save.')} finally{setBusy(false)}
  }
  async function removeComment(commentId:string) {
    try {await api('/comments/' + commentId,{method:'DELETE'});setData(await api<Data>('/modules/' + id))} catch(error){setError(error instanceof Error?error.message:'Unable to remove.')}
  }
  if(mode!=='media'&&session.available&&!data)return <section className="detail-section"><h2>Community</h2>{error?<><p className="file-error" role="alert">{error}</p><button className="button button-quiet" onClick={()=>{setError('');void api<Data>('/modules/'+id).then(value=>{setData(value);setRating(value.ownRating)}).catch(error=>setError(error.message))}}>Try again</button></>:<p className="service-note" role="status">Loading community…</p>}</section>
  return <>
    {mode !== 'discussion' && <section className="detail-section"><div className="section-title"><h2>Screenshots & audio</h2><a className="text-button" href={'#submit/' + id}>Contribute media via PR <Icon name="plus" size={15}/></a></div>{sourceMedia.length ? <div className="media-gallery">{sourceMedia.map(item=>{const url=assetUrl('module-media/'+id+'/'+document.version+'/'+item.path);return <figure key={item.path}>{item.captureType==='audio'?<audio controls preload="none" src={url}>Audio preview</audio>:<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={item.alt} loading="lazy"/></a>}<figcaption>{item.caption}<span>{item.captureType==='hardware'?'Hardware capture':item.captureType==='emulator'?'Emulator capture':'Audio preview'} · {item.credit} · {item.license}</span>{item.source!=='original'&&<a href={item.source} target="_blank" rel="noreferrer">Original source ↗</a>}</figcaption></figure>})}</div> : data?.media.length ? <MediaGallery media={data.media}/> : <div className="media-empty"><Icon name="file" size={24}/><div><strong>No captures published yet</strong><p>Actual device or emulator screenshots and audio previews appear here after review. Contributors can add them to the module folder in a pull request.</p></div></div>}</section>}
    {mode !== 'media' && <div className="community-grid"><section className="detail-section comments-section"><h2>Discussion <span className="subtle">{data?.comments.length ?? 0}</span></h2>{data?.comments.length ? <div className="comments-list">{data.comments.map(item => <article key={item.id}><div><strong>{item.author}</strong><time>{new Date(item.created_at.replace(' ','T')+'Z').toLocaleDateString()}</time>{item.canDelete && <button className="text-button" onClick={()=>void removeComment(item.id)}>Remove</button>}</div><p>{item.body}</p></article>)}</div> : <div className="comment-empty"><strong>No comments yet</strong><p>Questions, experiences and useful tips about this module.</p></div>}{!session.user&&<label className="guest-name">Name (optional)<input value={displayName} maxLength={60} placeholder="Guest" onChange={event=>setDisplayName(event.target.value)}/></label>}<label className="sr-only" htmlFor={'comment-'+id}>Comment</label><textarea id={'comment-'+id} value={comment} onChange={event=>setComment(event.target.value)} maxLength={2000} placeholder="Share your experience or ask a question…" rows={3}/><div className="composer-footer">{session.user?<span>Posting as {session.user.displayName}</span>:<span>No account or email required</span>}<button className="button button-quiet" disabled={!session.available||busy||!comment.trim()} onClick={()=>void send('comments')}>Post comment</button></div></section>
    <section className="detail-section ratings-section"><div className="section-title"><h2>Ratings</h2><button className="button button-quiet like-button" aria-label={(data?.liked?'Unlike ':'Like ')+id} aria-pressed={data?.liked??false} disabled={!session.available||busy} onClick={()=>void send('like')}>{data?.liked?'♥':'♡'} {data?.likes??0}</button></div><ModulePopularity statistics={data??undefined}/><div className="rating-empty"><strong>{data?.ratings.average?.toFixed(1) ?? '—'}</strong><div><span className="star-line">{[1,2,3,4,5].map(i=><Icon key={i} name="star" size={16}/>)}</span><span>{data?.ratings.count ? data.ratings.count+(data.ratings.count===1?' rating':' ratings'):'No ratings yet'}</span></div></div><fieldset className="rating-picker"><legend>Your rating</legend><div>{[1,2,3,4,5].map(i=><button key={i} className={rating>=i?'is-filled':''} aria-label={i+(i===1?' star':' stars')} aria-pressed={rating===i} onClick={()=>setRating(i)}><Icon name="star" size={23}/></button>)}</div></fieldset><button className="button button-quiet rating-save" disabled={!session.available||busy||!rating} onClick={()=>void send('rating')}>Save rating</button>{!session.user&&<p className="draft-note">No account required. One rating per browser; you can update it.</p>}</section></div>}
    <p className="community-privacy">Names, comments, ratings and likes are public. A session saved on this device lets you update your rating and remove your comments; clearing site data loses that access. Guest names are unverified. Posts are moderated.</p>
    {!session.available && <p className="service-note">Connect community services to post comments and reviews. Module media is contributed through GitHub PRs.</p>}
    {error&&<p className="file-error" role="alert">{error}</p>}{notice&&<p className="success-note" role="status">{notice}</p>}
  </>
}
