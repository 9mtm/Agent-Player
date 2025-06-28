import React, { useMemo } from 'react';
import { Row, Col, Progress, Alert, Card, Typography, Tooltip, Button, Empty, theme } from 'antd';
import {
    DesktopOutlined,
    HddOutlined,
    CloudUploadOutlined,
    ApiOutlined,
    CloudDownloadOutlined,
    DatabaseOutlined,
    GlobalOutlined,
    HistoryOutlined,
    ReloadOutlined,
    InfoCircleOutlined
} from '@ant-design/icons';
import type { SystemMonitorProps, NetworkConnection, SystemData } from './types';
import { useSystemInfo } from './hooks';
import { SystemMetricsCard, Metric } from './components';

const { Text, Link } = Typography;
const { useToken } = theme;

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const getStatusFromPercentage = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
};

const findServicePort = (data: SystemData | null, processName: string, defaultPort?: string): string | null => {
    if (!data?.network?.connections) return null;
    
    const connection = data.network.connections.find(
        (conn: NetworkConnection) => 
            conn.process_name === processName && 
            conn.status === "LISTEN" &&
            conn.local_addr?.includes(":")
    );
    
    if (connection) {
        const port = connection.local_addr.split(":")[1];
        return port;
    }
    
    return defaultPort || null;
};

const getBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}`;
};

export const SystemMonitor: React.FC<SystemMonitorProps & { enabled?: boolean }> = ({
    className,
    showLoadingState = true,
    enabled = false
}) => {
    const { data, error, loading, lastUpdated, isStale, refetch, history, collectNow } = useSystemInfo({
        enabled
    });

    const baseUrl = useMemo(() => getBaseUrl(), []);
    const { token } = useToken();

    if (error) {
        return (
            <Alert
                message="Error Loading System Metrics"
                description={error}
                type="error"
                showIcon
                action={
                    <Button 
                        onClick={() => refetch()}
                        icon={<ReloadOutlined />}
                    >
                        Retry
                    </Button>
                }
            />
        );
    }

    // Show empty state when no data is available
    if (!data && !loading) {
        return (
            <div className={className}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 24,
                    gap: 16
                }}>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                        <InfoCircleOutlined />
                        System Metrics
                    </Typography.Title>
                    <Button 
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={() => refetch()}
                        loading={loading}
                        size="large"
                    >
                        Load System Metrics
                    </Button>
                </div>

                <Card>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div style={{ textAlign: 'center' }}>
                                <Typography.Title level={5}>No System Metrics Available</Typography.Title>
                                <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                                    Click the button above to load current system metrics
                                </Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                    Metrics are stored in: logs/system/system_metrics_YYYYMMDD.json
                                </Text>
                            </div>
                        }
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className={className}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: 24,
                gap: 16
            }}>
                <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                        <InfoCircleOutlined />
                        System Metrics
                    </Typography.Title>
                    {lastUpdated && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            Last updated: {lastUpdated.toLocaleString()}
                        </Text>
                    )}
                </div>
                
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isStale && (
                        <Alert
                            message="Data may be outdated"
                            type="warning"
                            showIcon
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <Button 
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={() => refetch()}
                        loading={loading}
                        size="large"
                    >
                        Refresh Metrics
                    </Button>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={collectNow}
                        loading={loading}
                        size="large"
                        type="dashed"
                    >
                        Collect Now
                    </Button>
                </div>
            </div>

            <Row gutter={[16, 16]}>
                {/* CPU Usage */}
                <Col xs={24} lg={12}>
                    <SystemMetricsCard
                        title="CPU Usage"
                        icon={<DesktopOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <>
                                <Progress
                                    type="dashboard"
                                    percent={Math.round(data.cpu.usage.total)}
                                    strokeColor={getStatusFromPercentage(data.cpu.usage.total)}
                                />
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Metric
                                            label="Physical Cores"
                                            value={data.cpu.physical_cores}
                                            loading={loading}
                                        />
                                    </Col>
                                    <Col span={12}>
                                        <Metric
                                            label="Total Cores"
                                            value={data.cpu.total_cores}
                                            loading={loading}
                                        />
                                    </Col>
                                </Row>
                                {history.length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <HistoryOutlined /> Historical Usage:
                                        </Text>
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: '4px', 
                                            marginTop: '8px',
                                            height: '20px'
                                        }}>
                                            {history.map((metric, index) => (
                                                <Tooltip 
                                                    key={`cpu-history-${index}`}
                                                    title={`${Math.round(metric.cpu.usage.total)}% at ${formatDate(metric.timestamp)}`}
                                                >
                                                    <div style={{
                                                        flex: 1,
                                                        background: getStatusFromPercentage(metric.cpu.usage.total) === 'success' ? '#52c41a' :
                                                                   getStatusFromPercentage(metric.cpu.usage.total) === 'warning' ? '#faad14' : '#f5222d',
                                                        height: '100%',
                                                        opacity: 0.7,
                                                        cursor: 'pointer',
                                                    }} />
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </SystemMetricsCard>
                </Col>

                {/* Memory Usage */}
                <Col xs={24} lg={12}>
                    <SystemMetricsCard
                        title="Memory Usage"
                        icon={<DatabaseOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <>
                                <Progress
                                    type="dashboard"
                                    percent={Math.round(data.memory.virtual.percentage)}
                                    strokeColor={getStatusFromPercentage(data.memory.virtual.percentage)}
                                />
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Metric
                                            label="Total"
                                            value={formatBytes(data.memory.virtual.total)}
                                            loading={loading}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Metric
                                            label="Used"
                                            value={formatBytes(data.memory.virtual.used)}
                                            loading={loading}
                                            status={getStatusFromPercentage(data.memory.virtual.percentage)}
                                        />
                                    </Col>
                                    <Col span={8}>
                                        <Metric
                                            label="Available"
                                            value={formatBytes(data.memory.virtual.available)}
                                            loading={loading}
                                        />
                                    </Col>
                                </Row>
                                {history.length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            <HistoryOutlined /> Historical Memory Usage:
                                        </Text>
                                        <div style={{ 
                                            display: 'flex', 
                                            gap: '4px', 
                                            marginTop: '8px',
                                            height: '20px'
                                        }}>
                                            {history.map((metric, index) => (
                                                <Tooltip 
                                                    key={`memory-history-${index}`}
                                                    title={`${Math.round(metric.memory.virtual.percentage)}% at ${formatDate(metric.timestamp)}`}
                                                >
                                                    <div style={{
                                                        flex: 1,
                                                        background: getStatusFromPercentage(metric.memory.virtual.percentage) === 'success' ? '#52c41a' :
                                                                   getStatusFromPercentage(metric.memory.virtual.percentage) === 'warning' ? '#faad14' : '#f5222d',
                                                        height: '100%',
                                                        opacity: 0.7,
                                                        cursor: 'pointer',
                                                    }} />
                                                </Tooltip>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </SystemMetricsCard>
                </Col>

                {/* Storage */}
                <Col xs={24}>
                    <SystemMetricsCard
                        title="Storage"
                        icon={<HddOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <Row gutter={[16, 16]}>
                                {data.disk.map((drive, index) => (
                                    <Col xs={24} md={12} key={`drive-${index}-${drive.device}`}>
                                        <Card size="small">
                                            <div style={{ marginBottom: 8 }}>
                                                <Text strong>{drive.mountpoint}</Text>
                                                <Text type="secondary"> ({drive.filesystem})</Text>
                                            </div>
                                            <Progress
                                                percent={Math.round(drive.percentage)}
                                                strokeColor={getStatusFromPercentage(drive.percentage)}
                                                size="small"
                                            />
                                            <div style={{ marginTop: 8 }}>
                                                <Text type="secondary">
                                                    {formatBytes(drive.used)} / {formatBytes(drive.total_size)}
                                                </Text>
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </SystemMetricsCard>
                </Col>

                {/* Network */}
                <Col xs={24} lg={12}>
                    <SystemMetricsCard
                        title="Network Traffic"
                        icon={<GlobalOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Metric
                                        label="Data Sent"
                                        value={formatBytes(data.network.io.bytes_sent)}
                                        icon={<CloudUploadOutlined />}
                                        loading={loading}
                                    />
                                </Col>
                                <Col span={12}>
                                    <Metric
                                        label="Data Received"
                                        value={formatBytes(data.network.io.bytes_received)}
                                        icon={<CloudDownloadOutlined />}
                                        loading={loading}
                                    />
                                </Col>
                            </Row>
                        )}
                    </SystemMetricsCard>
                </Col>

                {/* Processes */}
                <Col xs={24} lg={12}>
                    <SystemMetricsCard
                        title="Process Statistics"
                        icon={<ApiOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <Row gutter={16}>
                                <Col span={8}>
                                    <Metric
                                        label="Total"
                                        value={data.processes.total}
                                        loading={loading}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Metric
                                        label="Running"
                                        value={data.processes.running}
                                        status="success"
                                        loading={loading}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Metric
                                        label="Stopped"
                                        value={data.processes.stopped}
                                        status="warning"
                                        loading={loading}
                                    />
                                </Col>
                            </Row>
                        )}
                    </SystemMetricsCard>
                </Col>

                {/* Active Services */}
                <Col xs={24}>
                    <SystemMetricsCard
                        title="Active Services"
                        icon={<ApiOutlined />}
                        loading={loading && showLoadingState}
                    >
                        {data && (
                            <Row gutter={[16, 16]}>
                                {/* LLM Service */}
                                <Col xs={24} sm={12} md={8}>
                                    <Card size="small" 
                                          hoverable
                                          onClick={() => {
                                              const port = findServicePort(data, "ollama.exe", "11434");
                                              if (port) window.open(`${baseUrl}:${port}`, '_blank');
                                          }}
                                    >
                                        <Metric
                                            label="LLM Service (Ollama)"
                                            value={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <Text>
                                                        {findServicePort(data, "ollama.exe") 
                                                            ? `${baseUrl}:${findServicePort(data, "ollama.exe")}`
                                                            : `${baseUrl}:11434`}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Status: {data?.network?.connections.some(conn => 
                                                            conn.process_name === "ollama.exe" && conn.status === "LISTEN"
                                                        ) ? <Text type="success">Running</Text> : <Text type="warning">Not running</Text>}
                                                    </Text>
                                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                        <Text type="secondary">API Endpoints:</Text>
                                                        <div style={{ paddingLeft: '8px' }}>
                                                            <Link href={`${baseUrl}:${findServicePort(data, "ollama.exe", "11434")}/api/generate`} target="_blank">/api/generate</Link>
                                                            <br/>
                                                            <Link href={`${baseUrl}:${findServicePort(data, "ollama.exe", "11434")}/api/chat`} target="_blank">/api/chat</Link>
                                                            <br/>
                                                            <Link href={`${baseUrl}:${findServicePort(data, "ollama.exe", "11434")}/api/embeddings`} target="_blank">/api/embeddings</Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            }
                                            icon={<ApiOutlined />}
                                            loading={loading}
                                        />
                                    </Card>
                                </Col>
                                
                                {/* Backend API */}
                                <Col xs={24} sm={12} md={8}>
                                    <Card size="small"
                                          hoverable
                                          onClick={() => {
                                              const apiPort = window.location.port || '8000';
                                              window.open(`${baseUrl}:${apiPort}`, '_blank');
                                          }}
                                    >
                                        <Metric
                                            label="Backend API"
                                            value={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <Text>{`${baseUrl}:${window.location.port || '8000'}`}</Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Status: <Text type="success">Running</Text>
                                                    </Text>
                                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                        <Text type="secondary">Documentation:</Text>
                                                        <div style={{ paddingLeft: '8px' }}>
                                                            <Link href={`${baseUrl}:${window.location.port || '8000'}/docs`} target="_blank">/docs</Link> - Swagger UI
                                                            <br/>
                                                            <Link href={`${baseUrl}:${window.location.port || '8000'}/redoc`} target="_blank">/redoc</Link> - ReDoc
                                                        </div>
                                                    </div>
                                                </div>
                                            }
                                            icon={<ApiOutlined />}
                                            loading={loading}
                                        />
                                    </Card>
                                </Col>
                                
                                {/* Frontend Server */}
                                <Col xs={24} sm={12} md={8}>
                                    <Card size="small"
                                          hoverable
                                          onClick={() => {
                                              const frontendPort = findServicePort(data, "node.exe", "3000");
                                              window.open(`${baseUrl}:${frontendPort}`, '_blank');
                                          }}
                                    >
                                        <Metric
                                            label="Frontend Server"
                                            value={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <Text>{`${baseUrl}:${findServicePort(data, "node.exe", "3000")}`}</Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Status: <Text type="success">Running</Text>
                                                    </Text>
                                                </div>
                                            }
                                            icon={<ApiOutlined />}
                                            loading={loading}
                                        />
                                    </Card>
                                </Col>
                                
                                {/* Database */}
                                <Col xs={24} sm={12} md={8}>
                                    <Card size="small"
                                          hoverable
                                          onClick={() => {
                                              const dbPort = findServicePort(data, "mysqld.exe", "8889");
                                              if (dbPort) window.open(`${baseUrl}:${dbPort}/phpmyadmin`, '_blank');
                                          }}
                                    >
                                        <Metric
                                            label="MySQL Database"
                                            value={
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <Text>
                                                        {findServicePort(data, "mysqld.exe") 
                                                            ? `${baseUrl}:${findServicePort(data, "mysqld.exe")}`
                                                            : "Service not detected"}
                                                    </Text>
                                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                                        Status: {data?.network?.connections.some(conn => 
                                                            conn.process_name === "mysqld.exe" && conn.status === "LISTEN"
                                                        ) ? <Text type="success">Running</Text> : <Text type="warning">Not running</Text>}
                                                    </Text>
                                                    {findServicePort(data, "mysqld.exe") && (
                                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                                            <Text type="secondary">Admin:</Text>
                                                            <div style={{ paddingLeft: '8px' }}>
                                                                <Link href={`${baseUrl}:${findServicePort(data, "mysqld.exe")}/phpmyadmin`} target="_blank">
                                                                    /phpmyadmin
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                            icon={<DatabaseOutlined />}
                                            loading={loading}
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        )}
                    </SystemMetricsCard>
                </Col>
            </Row>
        </div>
    );
};

export default SystemMonitor; 