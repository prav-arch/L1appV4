import os
import json
import tempfile
import time
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
import scapy.all as scapy
import pyshark

class PcapAnalyzer:
    """Analyzer for PCAP files"""
    
    def __init__(self):
        """Initialize the PCAP analyzer"""
        self.temp_dir = tempfile.mkdtemp()
        self.supported_protocols = [
            "TCP", "UDP", "HTTP", "DNS", "HTTPS", "ICMP", 
            "ARP", "SIP", "RTP", "RTCP", "SCTP", "Diameter"
        ]
    
    def analyze_pcap(self, pcap_file_path: str) -> Dict[str, Any]:
        """Analyze a PCAP file and extract relevant information"""
        # Ensure file exists
        if not os.path.exists(pcap_file_path):
            raise FileNotFoundError(f"PCAP file not found: {pcap_file_path}")
        
        # Use both Scapy and PyShark for different aspects of analysis
        packets = scapy.rdpcap(pcap_file_path)
        
        # Basic statistics
        basic_stats = self._get_basic_stats(packets)
        
        # Protocol analysis
        protocol_stats = self._analyze_protocols(pcap_file_path)
        
        # Conversation analysis
        conversations = self._analyze_conversations(packets)
        
        # Flow analysis
        flows = self._analyze_flows(pcap_file_path)
        
        # Anomaly detection
        anomalies = self._detect_anomalies(packets, protocol_stats)
        
        # Build result
        return {
            "basic_stats": basic_stats,
            "protocol_stats": protocol_stats,
            "conversations": conversations,
            "flows": flows,
            "anomalies": anomalies,
            "analysis_time": datetime.now().isoformat()
        }
    
    def _get_basic_stats(self, packets) -> Dict[str, Any]:
        """Extract basic statistics from a packet capture"""
        total_packets = len(packets)
        
        if total_packets == 0:
            return {
                "total_packets": 0,
                "capture_duration": 0,
                "average_packet_size": 0,
                "average_packets_per_second": 0
            }
        
        # Calculate capture duration
        start_time = float(packets[0].time)
        end_time = float(packets[total_packets - 1].time)
        duration = end_time - start_time if total_packets > 1 else 0
        
        # Calculate packet sizes
        packet_sizes = [len(p) for p in packets]
        avg_size = sum(packet_sizes) / total_packets
        
        # Calculate packets per second
        packets_per_second = total_packets / duration if duration > 0 else 0
        
        return {
            "total_packets": total_packets,
            "capture_duration": round(duration, 2),
            "average_packet_size": round(avg_size, 2),
            "average_packets_per_second": round(packets_per_second, 2),
            "total_bytes": sum(packet_sizes),
            "start_time": datetime.fromtimestamp(start_time).isoformat(),
            "end_time": datetime.fromtimestamp(end_time).isoformat()
        }
    
    def _analyze_protocols(self, pcap_file_path: str) -> Dict[str, Any]:
        """Analyze protocols in the packet capture"""
        try:
            # Use PyShark for protocol analysis
            cap = pyshark.FileCapture(pcap_file_path)
            
            # Count protocols
            protocol_counts = {}
            layer_counts = {}
            
            # Process first 10,000 packets max for performance
            limit = 10000
            count = 0
            
            for packet in cap:
                if count >= limit:
                    break
                
                # Count layers
                for layer in packet.layers:
                    layer_name = layer.layer_name.upper()
                    layer_counts[layer_name] = layer_counts.get(layer_name, 0) + 1
                
                # Count standard protocols
                for protocol in self.supported_protocols:
                    if hasattr(packet, protocol.lower()):
                        protocol_counts[protocol] = protocol_counts.get(protocol, 0) + 1
                
                count += 1
            
            cap.close()
            
            # Calculate percentages
            total = count
            protocol_percentages = {p: (c / total) * 100 for p, c in protocol_counts.items()}
            layer_percentages = {l: (c / total) * 100 for l, c in layer_counts.items()}
            
            return {
                "protocol_counts": protocol_counts,
                "protocol_percentages": {p: round(pct, 2) for p, pct in protocol_percentages.items()},
                "layer_counts": layer_counts,
                "layer_percentages": {l: round(pct, 2) for l, pct in layer_percentages.items()},
                "analyzed_packets": count
            }
            
        except Exception as e:
            print(f"Error analyzing protocols: {str(e)}")
            return {
                "protocol_counts": {},
                "protocol_percentages": {},
                "layer_counts": {},
                "layer_percentages": {},
                "analyzed_packets": 0,
                "error": str(e)
            }
    
    def _analyze_conversations(self, packets) -> List[Dict[str, Any]]:
        """Analyze conversations between IP addresses"""
        conversations = {}
        
        for packet in packets:
            if scapy.IP in packet:
                ip_src = packet[scapy.IP].src
                ip_dst = packet[scapy.IP].dst
                
                # Create a unique key for this conversation
                conv_key = f"{ip_src}_{ip_dst}" if ip_src < ip_dst else f"{ip_dst}_{ip_src}"
                
                if conv_key not in conversations:
                    conversations[conv_key] = {
                        "ip_a": ip_src if ip_src < ip_dst else ip_dst,
                        "ip_b": ip_dst if ip_src < ip_dst else ip_src,
                        "packets": 0,
                        "bytes": 0,
                        "start_time": float(packet.time),
                        "end_time": float(packet.time),
                        "a_to_b_packets": 0,
                        "b_to_a_packets": 0,
                        "a_to_b_bytes": 0,
                        "b_to_a_bytes": 0
                    }
                
                conv = conversations[conv_key]
                packet_len = len(packet)
                
                # Update conversation stats
                conv["packets"] += 1
                conv["bytes"] += packet_len
                conv["end_time"] = max(conv["end_time"], float(packet.time))
                
                # Direction-specific stats
                if ip_src == conv["ip_a"]:
                    conv["a_to_b_packets"] += 1
                    conv["a_to_b_bytes"] += packet_len
                else:
                    conv["b_to_a_packets"] += 1
                    conv["b_to_a_bytes"] += packet_len
        
        # Convert to list and add derived stats
        conv_list = []
        for conv in conversations.values():
            duration = conv["end_time"] - conv["start_time"]
            packets_per_sec = conv["packets"] / duration if duration > 0 else 0
            bytes_per_sec = conv["bytes"] / duration if duration > 0 else 0
            
            conv_list.append({
                **conv,
                "duration": round(duration, 2),
                "packets_per_sec": round(packets_per_sec, 2),
                "bytes_per_sec": round(bytes_per_sec, 2),
                "start_time": datetime.fromtimestamp(conv["start_time"]).isoformat(),
                "end_time": datetime.fromtimestamp(conv["end_time"]).isoformat()
            })
        
        # Sort by bytes (highest traffic first)
        conv_list.sort(key=lambda x: x["bytes"], reverse=True)
        
        return conv_list[:50]  # Return top 50 conversations
    
    def _analyze_flows(self, pcap_file_path: str) -> List[Dict[str, Any]]:
        """Analyze TCP/UDP flows"""
        try:
            # Use PyShark for flow analysis
            cap = pyshark.FileCapture(pcap_file_path)
            
            flows = {}
            
            # Process packets
            for packet in cap:
                if hasattr(packet, 'ip') and (hasattr(packet, 'tcp') or hasattr(packet, 'udp')):
                    ip_src = packet.ip.src
                    ip_dst = packet.ip.dst
                    
                    if hasattr(packet, 'tcp'):
                        proto = 'TCP'
                        sport = packet.tcp.srcport
                        dport = packet.tcp.dstport
                    else:  # UDP
                        proto = 'UDP'
                        sport = packet.udp.srcport
                        dport = packet.udp.dstport
                    
                    # Create flow key (5-tuple)
                    flow_key = f"{ip_src}:{sport}-{ip_dst}:{dport}-{proto}"
                    
                    if flow_key not in flows:
                        flows[flow_key] = {
                            "src_ip": ip_src,
                            "dst_ip": ip_dst,
                            "src_port": sport,
                            "dst_port": dport,
                            "protocol": proto,
                            "packets": 0,
                            "bytes": 0,
                            "start_time": float(packet.sniff_timestamp),
                            "end_time": float(packet.sniff_timestamp)
                        }
                    
                    flow = flows[flow_key]
                    flow["packets"] += 1
                    flow["bytes"] += int(packet.length)
                    flow["end_time"] = float(packet.sniff_timestamp)
            
            cap.close()
            
            # Convert to list and add derived stats
            flow_list = []
            for flow in flows.values():
                duration = flow["end_time"] - flow["start_time"]
                flow_list.append({
                    **flow,
                    "duration": round(duration, 2),
                    "start_time": datetime.fromtimestamp(flow["start_time"]).isoformat(),
                    "end_time": datetime.fromtimestamp(flow["end_time"]).isoformat()
                })
            
            # Sort by bytes (highest traffic first)
            flow_list.sort(key=lambda x: x["bytes"], reverse=True)
            
            return flow_list[:100]  # Return top 100 flows
            
        except Exception as e:
            print(f"Error analyzing flows: {str(e)}")
            return []
    
    def _detect_anomalies(self, packets, protocol_stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies in the packet capture"""
        anomalies = []
        
        # Check for potential SYN flood
        syn_count = 0
        syn_ack_count = 0
        
        for packet in packets:
            if scapy.TCP in packet:
                if packet[scapy.TCP].flags & 0x02:  # SYN flag
                    syn_count += 1
                if packet[scapy.TCP].flags & 0x12:  # SYN+ACK flags
                    syn_ack_count += 1
        
        # If many more SYNs than SYN-ACKs, might be a SYN flood
        if syn_count > 0 and syn_ack_count > 0:
            ratio = syn_count / syn_ack_count
            if ratio > 3 and syn_count > 100:
                anomalies.append({
                    "type": "SYN Flood",
                    "description": f"Potential SYN flood attack detected. SYN to SYN-ACK ratio: {ratio:.2f}",
                    "severity": "high" if ratio > 10 else "medium"
                })
        
        # Check for high rate of ICMP traffic (potential ping flood)
        if "ICMP" in protocol_stats.get("protocol_counts", {}):
            icmp_count = protocol_stats["protocol_counts"]["ICMP"]
            total_packets = protocol_stats.get("analyzed_packets", 0)
            if total_packets > 0:
                icmp_ratio = icmp_count / total_packets
                if icmp_ratio > 0.3 and icmp_count > 100:  # More than 30% ICMP and over 100 packets
                    anomalies.append({
                        "type": "ICMP Flood",
                        "description": f"Potential ICMP flood detected. {icmp_count} ICMP packets ({icmp_ratio:.2%} of traffic)",
                        "severity": "high" if icmp_ratio > 0.6 else "medium"
                    })
        
        # Check for DNS amplification
        dns_response_sizes = []
        for packet in packets:
            if scapy.DNS in packet and packet[scapy.DNS].qr == 1:  # DNS response
                dns_response_sizes.append(len(packet))
        
        if dns_response_sizes:
            avg_dns_size = sum(dns_response_sizes) / len(dns_response_sizes)
            if avg_dns_size > 500 and len(dns_response_sizes) > 50:  # Large DNS responses
                anomalies.append({
                    "type": "DNS Amplification",
                    "description": f"Potential DNS amplification detected. Average response size: {avg_dns_size:.2f} bytes",
                    "severity": "medium"
                })
        
        # Check for fragmentation
        frag_count = 0
        for packet in packets:
            if scapy.IP in packet:
                if packet[scapy.IP].flags & 0x1 or packet[scapy.IP].frag != 0:  # More fragments or fragment offset
                    frag_count += 1
        
        if frag_count > 100:  # Lots of fragmented packets
            anomalies.append({
                "type": "IP Fragmentation",
                "description": f"High number of fragmented packets: {frag_count}",
                "severity": "low"
            })
        
        return anomalies
    
    def extract_telecom_protocols(self, pcap_file_path: str) -> Dict[str, Any]:
        """Extract telecom-specific protocol information"""
        try:
            cap = pyshark.FileCapture(pcap_file_path)
            
            telecom_stats = {
                "sip_calls": {},
                "rtp_streams": {},
                "diameter_sessions": {},
                "sctp_associations": {}
            }
            
            for packet in cap:
                # SIP analysis
                if hasattr(packet, 'sip'):
                    if hasattr(packet.sip, 'Call-ID'):
                        call_id = packet.sip.get_field_value('Call-ID')
                        if call_id not in telecom_stats["sip_calls"]:
                            telecom_stats["sip_calls"][call_id] = {
                                "call_id": call_id,
                                "start_time": float(packet.sniff_timestamp),
                                "end_time": float(packet.sniff_timestamp),
                                "packets": 0,
                                "methods": set()
                            }
                        
                        call = telecom_stats["sip_calls"][call_id]
                        call["packets"] += 1
                        call["end_time"] = float(packet.sniff_timestamp)
                        
                        if hasattr(packet.sip, 'Method'):
                            call["methods"].add(packet.sip.Method)
                
                # RTP analysis
                if hasattr(packet, 'rtp'):
                    ssrc = packet.rtp.ssrc
                    if ssrc not in telecom_stats["rtp_streams"]:
                        telecom_stats["rtp_streams"][ssrc] = {
                            "ssrc": ssrc,
                            "start_time": float(packet.sniff_timestamp),
                            "end_time": float(packet.sniff_timestamp),
                            "packets": 0,
                            "bytes": 0
                        }
                    
                    stream = telecom_stats["rtp_streams"][ssrc]
                    stream["packets"] += 1
                    stream["bytes"] += int(packet.length)
                    stream["end_time"] = float(packet.sniff_timestamp)
                
                # Diameter analysis
                if hasattr(packet, 'diameter'):
                    if hasattr(packet.diameter, 'Session-Id'):
                        session_id = packet.diameter.get_field_value('Session-Id')
                        if session_id not in telecom_stats["diameter_sessions"]:
                            telecom_stats["diameter_sessions"][session_id] = {
                                "session_id": session_id,
                                "start_time": float(packet.sniff_timestamp),
                                "end_time": float(packet.sniff_timestamp),
                                "packets": 0,
                                "commands": set()
                            }
                        
                        session = telecom_stats["diameter_sessions"][session_id]
                        session["packets"] += 1
                        session["end_time"] = float(packet.sniff_timestamp)
                        
                        if hasattr(packet.diameter, 'Command-Code'):
                            session["commands"].add(packet.diameter.get_field_value('Command-Code'))
                
                # SCTP analysis
                if hasattr(packet, 'sctp'):
                    src_port = packet.sctp.srcport
                    dst_port = packet.sctp.dstport
                    
                    # Create association key
                    if hasattr(packet, 'ip'):
                        assoc_key = f"{packet.ip.src}:{src_port}-{packet.ip.dst}:{dst_port}"
                        if assoc_key not in telecom_stats["sctp_associations"]:
                            telecom_stats["sctp_associations"][assoc_key] = {
                                "src": f"{packet.ip.src}:{src_port}",
                                "dst": f"{packet.ip.dst}:{dst_port}",
                                "start_time": float(packet.sniff_timestamp),
                                "end_time": float(packet.sniff_timestamp),
                                "packets": 0,
                                "chunks": 0
                            }
                        
                        assoc = telecom_stats["sctp_associations"][assoc_key]
                        assoc["packets"] += 1
                        assoc["end_time"] = float(packet.sniff_timestamp)
                        
                        if hasattr(packet.sctp, 'chunks'):
                            assoc["chunks"] += int(packet.sctp.chunks)
            
            cap.close()
            
            # Convert sets to lists for JSON serialization and add timing info
            for call_id, call in telecom_stats["sip_calls"].items():
                call["methods"] = list(call["methods"])
                call["duration"] = round(call["end_time"] - call["start_time"], 2)
                call["start_time"] = datetime.fromtimestamp(call["start_time"]).isoformat()
                call["end_time"] = datetime.fromtimestamp(call["end_time"]).isoformat()
            
            for ssrc, stream in telecom_stats["rtp_streams"].items():
                stream["duration"] = round(stream["end_time"] - stream["start_time"], 2)
                stream["start_time"] = datetime.fromtimestamp(stream["start_time"]).isoformat()
                stream["end_time"] = datetime.fromtimestamp(stream["end_time"]).isoformat()
            
            for session_id, session in telecom_stats["diameter_sessions"].items():
                session["commands"] = list(session["commands"])
                session["duration"] = round(session["end_time"] - session["start_time"], 2)
                session["start_time"] = datetime.fromtimestamp(session["start_time"]).isoformat()
                session["end_time"] = datetime.fromtimestamp(session["end_time"]).isoformat()
            
            for assoc_key, assoc in telecom_stats["sctp_associations"].items():
                assoc["duration"] = round(assoc["end_time"] - assoc["start_time"], 2)
                assoc["start_time"] = datetime.fromtimestamp(assoc["start_time"]).isoformat()
                assoc["end_time"] = datetime.fromtimestamp(assoc["end_time"]).isoformat()
            
            # Convert dictionaries to lists
            telecom_stats["sip_calls"] = list(telecom_stats["sip_calls"].values())
            telecom_stats["rtp_streams"] = list(telecom_stats["rtp_streams"].values())
            telecom_stats["diameter_sessions"] = list(telecom_stats["diameter_sessions"].values())
            telecom_stats["sctp_associations"] = list(telecom_stats["sctp_associations"].values())
            
            return telecom_stats
            
        except Exception as e:
            print(f"Error extracting telecom protocols: {str(e)}")
            return {
                "sip_calls": [],
                "rtp_streams": [],
                "diameter_sessions": [],
                "sctp_associations": [],
                "error": str(e)
            }
    
    def generate_pcap_summary(self, pcap_file_path: str, analysis_result: Dict[str, Any]) -> str:
        """Generate a human-readable summary of the PCAP file"""
        basic_stats = analysis_result.get("basic_stats", {})
        protocol_stats = analysis_result.get("protocol_stats", {})
        anomalies = analysis_result.get("anomalies", [])
        
        summary = []
        
        # Basic information
        summary.append(f"PCAP Analysis Summary")
        summary.append(f"====================")
        summary.append(f"")
        summary.append(f"File: {os.path.basename(pcap_file_path)}")
        summary.append(f"Capture duration: {basic_stats.get('capture_duration', 0)} seconds")
        summary.append(f"Total packets: {basic_stats.get('total_packets', 0)}")
        summary.append(f"Total data: {basic_stats.get('total_bytes', 0) / 1024:.2f} KB")
        summary.append(f"Average packet size: {basic_stats.get('average_packet_size', 0):.2f} bytes")
        summary.append(f"Packets per second: {basic_stats.get('average_packets_per_second', 0):.2f}")
        summary.append(f"")
        
        # Protocol distribution
        summary.append(f"Protocol Distribution")
        summary.append(f"--------------------")
        protocol_counts = protocol_stats.get("protocol_counts", {})
        for protocol, count in sorted(protocol_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = protocol_stats.get("protocol_percentages", {}).get(protocol, 0)
            summary.append(f"{protocol}: {count} packets ({percentage:.2f}%)")
        summary.append(f"")
        
        # Anomalies
        if anomalies:
            summary.append(f"Detected Anomalies")
            summary.append(f"-----------------")
            for anomaly in anomalies:
                summary.append(f"{anomaly.get('type')} ({anomaly.get('severity', 'medium')}): {anomaly.get('description')}")
            summary.append(f"")
        
        # Telecom protocols
        telecom_stats = analysis_result.get("telecom_stats", {})
        
        sip_calls = telecom_stats.get("sip_calls", [])
        if sip_calls:
            summary.append(f"SIP Calls: {len(sip_calls)}")
            for i, call in enumerate(sip_calls[:5]):  # Show top 5
                summary.append(f"  {i+1}. Call-ID: {call.get('call_id', 'Unknown')}")
                summary.append(f"     Duration: {call.get('duration', 0)} seconds")
                summary.append(f"     Methods: {', '.join(call.get('methods', []))}")
            if len(sip_calls) > 5:
                summary.append(f"     ... and {len(sip_calls) - 5} more calls")
            summary.append(f"")
        
        rtp_streams = telecom_stats.get("rtp_streams", [])
        if rtp_streams:
            summary.append(f"RTP Streams: {len(rtp_streams)}")
            for i, stream in enumerate(rtp_streams[:5]):  # Show top 5
                summary.append(f"  {i+1}. SSRC: {stream.get('ssrc', 'Unknown')}")
                summary.append(f"     Duration: {stream.get('duration', 0)} seconds")
                summary.append(f"     Packets: {stream.get('packets', 0)}")
            if len(rtp_streams) > 5:
                summary.append(f"     ... and {len(rtp_streams) - 5} more streams")
            summary.append(f"")
        
        return "\n".join(summary)