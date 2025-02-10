import React from "react";
// @ts-ignore
import {ReactComponent as FolderIcon} from '../assets/folder.svg'
// @ts-ignore
import {ReactComponent as PlayIcon} from '../assets/play.svg'
// @ts-ignore
import {ReactComponent as PauseIcon} from '../assets/pause.svg'
// @ts-ignore
import {ReactComponent as StopIcon} from '../assets/stop.svg'

import { TDirStructure } from "./shared/types";
import { join_path, os_sep, sort_dir } from "./shared/functions";
import { ipcRenderer } from "electron";

const Home = React.memo((props: any) => {
    const main_cont_ref = React.useRef<HTMLDivElement | null>(null)
    const progress_cont_ref = React.useRef<HTMLDivElement | null>(null)
    const visualizer_ref = React.useRef<HTMLDivElement | null>(null)
    const audio_element_ref = React.useRef<HTMLAudioElement | null>(null)
    const [dir, set_dir] = React.useState<TDirStructure[]>([])
    const [isPlaying, set_IsPlaying] = React.useState<boolean>(false)
    const [audio_duration, set_audio_duration] = React.useState<string>('00:00');
    const [audio_time, set_audio_time] = React.useState<string>('00:00');
    const [current_audio, set_current_audio] = React.useState<string>('');
    const [current_path, set_current_path] = React.useState<string>('');

    const handleMouseDown = React.useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation()
        console.log("e target", e.currentTarget, e.target);
        if (!(e.target as HTMLElement).classList.contains('resize')) {
            main_cont_ref.current.onmousemove = (e) => null;
            main_cont_ref.current.onmouseup = (e) => null; 
            return null;
        }
        
        main_cont_ref.current.onmousemove = (e) => handleMouseMove(e)
        main_cont_ref.current.onmouseup = (e) => handleMouseUp(e)
    }, [main_cont_ref.current])

    const handleMouseMove = React.useCallback((e: MouseEvent) => {
        console.log("e", e);
        e.stopPropagation()
        document.documentElement.style.setProperty('--sidebar-width', e.clientX+'px')
        
    }, [main_cont_ref.current])

    const handleMouseUp = React.useCallback((e: MouseEvent) => {
        console.log("e", e);
        e.stopPropagation()
        main_cont_ref.current.onmousemove = (e) => null;
        main_cont_ref.current.onmouseup = (e) => null;        
    }, [main_cont_ref.current])

    const handleListDir = React.useCallback(async (path?: string) => {
        const dir_content = await window.electron.get_dir(path)
        console.log("dir_content", dir_content);
        set_current_path(dir_content.length == 0 ? path : dir_content[0].parentPath)
        set_dir(dir_content.sort(sort_dir))
    }, [])

    const handleGetFile = React.useCallback(async (path: string) => {
        const file_content = await window.electron.get_file(path)
        console.log("file_content", file_content);
        const file = new File([new Uint8Array(file_content)], 'audio-file', {type: 'audio/mp3'})
        const fr = new FileReader()
        fr.onload = async (e) => {
            // e.target.result
            if (audio_element_ref.current != null) audio_element_ref.current?.pause();
            audio_element_ref.current = new Audio(e.target.result as string)
            await audio_element_ref.current.play()
            set_IsPlaying(true)

            set_current_audio(path.split(os_sep()).at(-1))

            audio_element_ref.current.ontimeupdate = () => {
                const current_time = audio_element_ref.current.currentTime
                const secs = current_time % 60 < 10 ? '0' + Math.floor(current_time % 60) : Math.floor(current_time % 60);
                const mins = current_time / 60 < 10 ? '0' + Math.floor(current_time / 60) : Math.floor(current_time / 60);
                set_audio_time(mins + ":" + secs)                
                progress_cont_ref.current.style.width = ((audio_element_ref.current.currentTime / audio_element_ref.current.duration) * 100) + '%'            
            }


            const duration = audio_element_ref.current.duration

            const secs = duration % 60 < 10 ? '0' + Math.floor(duration % 60) : Math.floor(duration % 60);
            const mins = duration / 60 < 10 ? '0' + Math.floor(duration / 60) : Math.floor(duration / 60);
            set_audio_duration(mins + ":" + secs)

            const audio_context = new AudioContext()
            const analyzer = audio_context.createAnalyser()

            const audio_source = audio_context.createMediaElementSource(audio_element_ref.current)
            audio_source.connect(analyzer)
            audio_source.connect(audio_context.destination)

            const frequencyData = new Uint8Array(analyzer.frequencyBinCount)

            // const update_source = () => {
            //     analyzer.getByteFrequencyData(frequencyData)
            //     const reduced = frequencyData.reduce((acc: any, v) => acc + v, 0) / frequencyData.length
            //     const clipped_data = reduced / 255 * 100 + 1;
            //     (visualizer_ref.current.querySelector('.bar') as HTMLElement).style.height = clipped_data + '%'

            //     requestAnimationFrame(update_source)
            // }
            const update_source = () => {
                analyzer.getByteFrequencyData(frequencyData)
                visualizer_ref.current.innerHTML = ''
                for (let index = 0; index < frequencyData.length; index++) {
                // for (let index = 0; index < frequencyData.length; index += 30) {
                    const freq = frequencyData[index] / 255 * 100 + 1;
                    const bar = document.createElement('div')
                    bar.className = 'bar'
                    bar.style.height = freq + '%'
                    visualizer_ref.current.appendChild(bar);
                }

                requestAnimationFrame(update_source)
            }
            update_source()
        }
        fr.readAsDataURL(file)
    }, [audio_element_ref.current, progress_cont_ref.current, visualizer_ref.current])

    const handle_play_pause = React.useCallback((state: boolean) => {
        state ? audio_element_ref.current.play() : audio_element_ref.current.pause();
        set_IsPlaying(state)
    }, [audio_element_ref.current])

    const handle_stop = React.useCallback(() => {
        audio_element_ref.current.pause()
        audio_element_ref.current.currentTime = 0
        set_IsPlaying(false)
    }, [audio_element_ref.current])

    const handle_seek = React.useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.stopPropagation()
        if (audio_element_ref.current == null) return null;
        console.log(e)
        const seeker_cont_rect = e.currentTarget.getBoundingClientRect()
        const distance = e.clientX - seeker_cont_rect.x
        console.log("distance", distance);
        const perc_moved = distance / seeker_cont_rect.width
        const audio_el_duration_perc = perc_moved * audio_element_ref.current.duration;
        audio_element_ref.current.currentTime = audio_el_duration_perc;
    }, [audio_element_ref.current]);

    const handle_content_menu = React.useCallback(() => {
        window.electron.open_context_menu(current_path, (dir_content: any) => {
            console.log("callback works", dir_content)
            set_current_path(dir_content.length == 0 ? current_path : dir_content[0].parentPath)
            set_dir(dir_content.sort(sort_dir))
        })
    }, [current_path])

    React.useLayoutEffect(() => {
        handleListDir();
    }, [])

    return (
        // <div ref={main_cont_ref} className="main">
        <>
            <div className="header">
                Audio Player
            </div>
            <div ref={main_cont_ref} className="main"  onMouseDown={handleMouseDown}>
                <div className="sidebar" onAuxClick={handle_content_menu} onClick={(e) => e.stopPropagation()}>
                    <div className="resize"></div>
                    <div className="pagination">
                        {
                            current_path.split(os_sep()).map((p,i) => 
                                <span className="path" onClick={() => handleListDir(current_path.split(os_sep()).slice(0, i+1).join(os_sep()))}>{p + os_sep()}</span>
                            )
                        }
                    </div>
                    <div className="directory-list">
                        {
                            dir.map(d => 
                                <div key={d.name} onClick={() => d.isDir ? handleListDir(join_path([d.parentPath, d.name])) : handleGetFile(join_path([d.parentPath, d.name]))} className={d.isDir ? 'list-item directory' : "list-item"}>
                                    {
                                        d.isDir &&
                                        <FolderIcon width={20} height={20} />
                                    }
                                    <span className={current_audio == d.name ? 'current-playing' : ''}>{d.name}</span>
                                </div>
                            )
                        }

                        {
                            dir.length == 0 &&
                            <div className={"list-item"}>
                                <span><em>Directory is empty</em></span>
                            </div>
                        }

                    </div>
                </div>
                <div className="content">
                    <div className="wrapper">
                        <div className="visualizer" ref={visualizer_ref}>
                            <div className="bar"></div>

                        </div>
                        <div className="current-audio" onClick={handle_seek}>
                            {current_audio}
                        </div>
                        <div className="progress" onClick={handle_seek}>
                            <div ref={progress_cont_ref} className="inner"></div>
                        </div>
                        <div className="controls">
                            <span>
                                <span>{audio_time}</span>
                                <span>{' '} - {audio_duration}</span>
                            </span>
                            {
                                isPlaying?
                                <PauseIcon onClick={() => handle_play_pause(false)} width={20} height={20} fill={'--tint-blue'} />:
                                <PlayIcon onClick={() => handle_play_pause(true)} width={20} height={20} fill={'--tint-blue'} />
                            }
                            <StopIcon onClick={handle_stop} width={20} height={20} fill={'--tint-blue'} />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
})

export default Home