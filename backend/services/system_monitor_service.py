import os
import json
import psutil
import platform
import socket
from datetime import datetime
from typing import Dict, List, Optional
import logging
from pathlib import Path

# Configure logging to show in terminal
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_size(bytes_value: int) -> str:
    """Convert bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if bytes_value < 1024:
            return f"{bytes_value:.2f} {unit}"
        bytes_value /= 1024

class SystemMonitorService:
    def __init__(self):
        self.log_dir = Path("backend/logs/system")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.current_log_file = self.log_dir / f"system_metrics_{datetime.now().strftime('%Y%m%d')}.json"
        self.max_history_days = 7  # Keep logs for 7 days
        logger.info(f"SystemMonitorService initialized. Log directory: {self.log_dir}")

    def cleanup_old_logs(self):
        """Delete log files older than max_history_days"""
        try:
            logger.info("Starting cleanup of old log files...")
            current_date = datetime.now()
            for log_file in self.log_dir.glob("system_metrics_*.json"):
                file_date_str = log_file.stem.split('_')[-1]
                file_date = datetime.strptime(file_date_str, '%Y%m%d')
                days_old = (current_date - file_date).days
                if days_old > self.max_history_days:
                    log_file.unlink()
                    logger.info(f"Deleted old log file: {log_file}")
            logger.info("Log cleanup completed")
        except Exception as e:
            logger.error(f"Error cleaning up old logs: {str(e)}")

    def get_cpu_info(self) -> Dict:
        """Get detailed CPU information"""
        logger.info("Scanning CPU information...")
        cpu_freq = psutil.cpu_freq()
        cpu_info = {
            "physical_cores": psutil.cpu_count(logical=False),
            "total_cores": psutil.cpu_count(logical=True),
            "frequencies": {
                "max": cpu_freq.max if cpu_freq else 0,
                "min": cpu_freq.min if cpu_freq else 0,
                "current": cpu_freq.current if cpu_freq else 0
            },
            "usage": {
                "total": psutil.cpu_percent(interval=1),
                "per_core": psutil.cpu_percent(interval=1, percpu=True)
            }
        }
        logger.info(f"CPU Usage: {cpu_info['usage']['total']}%")
        return cpu_info

    def get_memory_info(self) -> Dict:
        """Get detailed memory information"""
        logger.info("Scanning memory information...")
        virtual_memory = psutil.virtual_memory()
        swap_memory = psutil.swap_memory()
        memory_info = {
            "virtual": {
                "total": virtual_memory.total,
                "available": virtual_memory.available,
                "used": virtual_memory.used,
                "percentage": virtual_memory.percent,
                "total_formatted": get_size(virtual_memory.total),
                "available_formatted": get_size(virtual_memory.available),
                "used_formatted": get_size(virtual_memory.used)
            },
            "swap": {
                "total": swap_memory.total,
                "free": swap_memory.free,
                "used": swap_memory.used,
                "percentage": swap_memory.percent,
                "total_formatted": get_size(swap_memory.total),
                "free_formatted": get_size(swap_memory.free),
                "used_formatted": get_size(swap_memory.used)
            }
        }
        logger.info(f"Memory Usage: {memory_info['virtual']['percentage']}%")
        return memory_info

    def get_disk_info(self) -> List[Dict]:
        """Get detailed disk information"""
        logger.info("Scanning disk information...")
        disks = []
        for partition in psutil.disk_partitions():
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                disk_info = {
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "filesystem": partition.fstype,
                    "total_size": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percentage": usage.percent,
                    "total_formatted": get_size(usage.total),
                    "used_formatted": get_size(usage.used),
                    "free_formatted": get_size(usage.free)
                }
                disks.append(disk_info)
                logger.info(f"Disk {partition.device}: {disk_info['percentage']}% used")
            except Exception as e:
                logger.warning(f"Error scanning disk {partition.device}: {str(e)}")
                continue

        # Add disk I/O information
        try:
            disk_io = psutil.disk_io_counters()
            if disk_io:
                io_info = {
                    "io_counters": {
                        "read_bytes": disk_io.read_bytes,
                        "write_bytes": disk_io.write_bytes,
                        "read_formatted": get_size(disk_io.read_bytes),
                        "write_formatted": get_size(disk_io.write_bytes)
                    }
                }
                disks.append(io_info)
                logger.info(f"Disk I/O - Read: {io_info['io_counters']['read_formatted']}, Write: {io_info['io_counters']['write_formatted']}")
        except Exception as e:
            logger.warning(f"Error getting disk I/O information: {str(e)}")

        return disks

    def get_network_info(self) -> Dict:
        """Get detailed network information"""
        logger.info("Scanning network information...")
        net_io = psutil.net_io_counters()
        net_if_addrs = psutil.net_if_addrs()
        
        interfaces = []
        for interface_name, addrs in net_if_addrs.items():
            interface_info = {
                "name": interface_name,
                "addresses": []
            }
            for addr in addrs:
                addr_info = {
                    "family": str(addr.family),
                    "address": addr.address,
                    "netmask": addr.netmask if hasattr(addr, 'netmask') else None,
                    "broadcast": addr.broadcast if hasattr(addr, 'broadcast') else None
                }
                interface_info["addresses"].append(addr_info)
            interfaces.append(interface_info)
            logger.info(f"Network Interface: {interface_name}")

        # Get network connections
        connections = []
        try:
            logger.info("Scanning network connections...")
            for conn in psutil.net_connections(kind='inet'):
                conn_info = {
                    "fd": conn.fd,
                    "family": str(conn.family),
                    "type": str(conn.type),
                    "local_addr": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                    "remote_addr": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    "status": conn.status,
                    "pid": conn.pid
                }
                if conn.pid:
                    try:
                        process = psutil.Process(conn.pid)
                        conn_info["process_name"] = process.name()
                    except:
                        conn_info["process_name"] = "unknown"
                connections.append(conn_info)
        except Exception as e:
            logger.warning(f"Error scanning network connections: {str(e)}")

        network_info = {
            "interfaces": interfaces,
            "connections": connections,
            "io": {
                "bytes_sent": net_io.bytes_sent,
                "bytes_received": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_received": net_io.packets_recv,
                "bytes_sent_formatted": get_size(net_io.bytes_sent),
                "bytes_received_formatted": get_size(net_io.bytes_recv)
            }
        }
        logger.info(f"Network I/O - Sent: {network_info['io']['bytes_sent_formatted']}, Received: {network_info['io']['bytes_received_formatted']}")
        return network_info

    def get_process_info(self) -> Dict:
        """Get detailed process information"""
        logger.info("Scanning process information...")
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'status', 'cpu_percent', 'memory_percent', 'create_time']):
            try:
                pinfo = proc.info
                pinfo['create_time'] = datetime.fromtimestamp(pinfo['create_time']).strftime('%Y-%m-%d %H:%M:%S')
                processes.append(pinfo)
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue

        # Sort by CPU usage
        processes.sort(key=lambda x: x.get('cpu_percent', 0), reverse=True)
        top_processes = processes[:10]  # Get top 10 processes

        process_info = {
            "total": len(processes),
            "running": sum(1 for p in processes if p.get('status') == 'running'),
            "sleeping": sum(1 for p in processes if p.get('status') == 'sleeping'),
            "stopped": sum(1 for p in processes if p.get('status') == 'stopped'),
            "zombie": sum(1 for p in processes if p.get('status') == 'zombie'),
            "top_processes": top_processes
        }
        logger.info(f"Total Processes: {process_info['total']}, Running: {process_info['running']}")
        return process_info

    def get_users_info(self) -> List[Dict]:
        """Get information about logged in users"""
        logger.info("Scanning user information...")
        users = []
        for user in psutil.users():
            user_info = {
                "name": user.name,
                "terminal": user.terminal,
                "host": user.host,
                "started": datetime.fromtimestamp(user.started).strftime('%Y-%m-%d %H:%M:%S')
            }
            users.append(user_info)
            logger.info(f"User: {user_info['name']}, Started: {user_info['started']}")
        return users

    def get_system_metrics(self) -> Dict:
        """Get comprehensive system metrics"""
        try:
            logger.info("\n" + "="*50)
            logger.info("Starting system metrics collection...")
            logger.info("="*50 + "\n")

            # Clean up old logs first
            self.cleanup_old_logs()

            metrics = {
                "timestamp": datetime.now().isoformat(),
                "cpu": self.get_cpu_info(),
                "memory": self.get_memory_info(),
                "disk": self.get_disk_info(),
                "network": self.get_network_info(),
                "processes": self.get_process_info(),
                "users": self.get_users_info(),
                "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
                "platform": platform.platform()
            }
            
            # Save metrics to log file
            logger.info("\nSaving metrics to log file...")
            self.save_metrics(metrics)
            logger.info(f"Metrics saved to: {self.current_log_file}")
            
            logger.info("\n" + "="*50)
            logger.info("System metrics collection completed")
            logger.info("="*50 + "\n")
            
            return metrics
        except Exception as e:
            logger.error(f"Error getting system metrics: {str(e)}")
            return self.get_last_metrics() or {}

    def save_metrics(self, metrics: Dict) -> None:
        """Save metrics to JSON log file"""
        try:
            # Create new log file for each day
            current_date = datetime.now().strftime('%Y%m%d')
            self.current_log_file = self.log_dir / f"system_metrics_{current_date}.json"
            
            # Read existing logs
            existing_logs = []
            if self.current_log_file.exists():
                with open(self.current_log_file, 'r') as f:
                    existing_logs = json.load(f)
            
            # Append new metrics
            existing_logs.append(metrics)
            
            # Keep only last 24 hours of logs (assuming 1 log per hour = 24 logs)
            if len(existing_logs) > 24:
                existing_logs = existing_logs[-24:]
            
            # Save updated logs
            with open(self.current_log_file, 'w') as f:
                json.dump(existing_logs, f, indent=2)
            
            logger.info(f"Metrics saved successfully to {self.current_log_file}")
                
        except Exception as e:
            logger.error(f"Error saving metrics to log: {str(e)}")

    def get_last_metrics(self) -> Optional[Dict]:
        """Get the most recent metrics from log file"""
        try:
            if self.current_log_file.exists():
                with open(self.current_log_file, 'r') as f:
                    logs = json.load(f)
                    return logs[-1] if logs else None
            return None
        except Exception as e:
            logger.error(f"Error reading metrics from log: {str(e)}")
            return None

    def get_metrics_history(self, hours: int = 24) -> List[Dict]:
        """Get metrics history for the specified number of hours"""
        try:
            if self.current_log_file.exists():
                with open(self.current_log_file, 'r') as f:
                    logs = json.load(f)
                    return logs[-hours:]
            return []
        except Exception as e:
            logger.error(f"Error reading metrics history: {str(e)}")
            return [] 